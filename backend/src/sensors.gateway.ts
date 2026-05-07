import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayDisconnect, // EKLENDİ: Kullanıcı çıkışlarını yakalamak için
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from './users/users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class SensorsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  // Kullanıcıların aktif çalışma seanslarını takip etmek için (Puanlama için)
  private activeSessions = new Map<number, number>();

  // EKLENDİ: Odalardaki anlık kullanıcı listesini ve "masada mı?" durumunu tutmak için
  private connectedUsers = new Map<string, { userId: number; fullName: string; roomName: string; isAtDesk: boolean }>();

  constructor(private readonly usersService: UsersService) {}

  // ── KULLANICI UYGULAMAYI KAPATTIĞINDA / BAĞLANTI KOPTUĞUNDA ──
  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.connectedUsers.delete(client.id); // Listeden sil
      this.broadcastRoomUsers(user.roomName); // Kalanlara güncel listeyi gönder
      console.log(`[Bağlantı Koptu] ${user.fullName} lobiden ayrıldı.`);
    }
  }

  // ── ODADAKİ HERKESE GÜNCEL LİSTEYİ GÖNDEREN YARDIMCI FONKSİYON ──
  private broadcastRoomUsers(roomName: string) {
    // Sadece o odadaki kişileri filtreleyip diziye çevir
    const usersInRoom = Array.from(this.connectedUsers.values()).filter(
      (u) => u.roomName === roomName
    );
    // Frontend'in beklediği 'room_users' kanalına bu diziyi gönder
    this.server.to(roomName).emit('room_users', usersInRoom);
  }

  // ── KULLANICIYI LOBİYE (ODAYA) ALMA ──
  @SubscribeMessage('join_lobby')
  handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, roomName, fullName } = data;

    // Socket.io "Rooms" özelliğini kullanarak kullanıcıyı odaya dahil et
    client.join(roomName);
    
    // Kullanıcıyı anlık listemize ekle (Başlangıçta isAtDesk: false)
    this.connectedUsers.set(client.id, { userId, fullName, roomName, isAtDesk: false });

    console.log(`[Lobi Katılım] ${fullName} (ID: ${userId}), '${roomName}' lobisine girdi.`);

    // EKLENDİ: Odaya yeni biri girdiği için odadaki herkese TAM LİSTEYİ gönder
    this.broadcastRoomUsers(roomName);

    // Odadaki diğer kullanıcılara yeni birinin geldiğini bildir (Geçmiş uyumluluk için bırakıldı)
    this.server.to(roomName).emit('user_joined_lobby', {
      fullName, 
      userId,
    });
  }

  // ── GLOBAL CHAT - MESAJ GÖNDERME VE DAĞITMA ──
  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, fullName, roomName, text, type, fileUrl, isPremium } = data;

    console.log(`[Chat - ${roomName}] ${fullName}: ${text}`);

    // Mesajı SADECE ilgili lobiye (odaya) bağlı olanlara ilet
    this.server.to(roomName).emit('receive_message', {
      userId,
      fullName,
      text,
      type,
      fileUrl,
      isPremium,
      timestamp: new Date().toISOString(),
    });
  }

  // ── ODAKLANMA DURUMU VE PUANLAMA TAKİBİ ──
  @SubscribeMessage('update_presence')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket, // EKLENDİ: Client ID'ye ulaşmak için
    @MessageBody() payload: any
  ) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, isAtDesk, roomName } = data;

    // EKLENDİ: Kullanıcının durumunu (isAtDesk) anlık listede güncelle
    const user = this.connectedUsers.get(client.id);
    if (user) {
      user.isAtDesk = isAtDesk;
      this.connectedUsers.set(client.id, user);
      
      // Birinin durumu (yeşil/gri nokta) değiştiği için odadaki herkese güncel listeyi gönder
      this.broadcastRoomUsers(roomName);
    }

    if (isAtDesk) {
      // Telefon masaya bırakıldığında süreyi başlat
      this.activeSessions.set(userId, Date.now());
      console.log(`[Odaklanma Başladı - ${roomName}] Kullanıcı: ${userId}`);
    } else {
      // Telefon masadan kaldırıldığında süreyi hesapla ve veritabanına yaz
      const startTime = this.activeSessions.get(userId);
      if (startTime) {
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationMinutes = Math.round(durationMs / 60000);

        if (durationMinutes > 0) {
          const updatedUser = await this.usersService.addFocusTime(userId, durationMinutes);
          
          if (updatedUser) {
            // Güncel puanı tüm uygulamaya duyur (Liderlik tablosu vb. için)
            this.server.emit('score_updated', { 
              userId: userId, 
              newTotal: updatedUser.totalFocusMinutes 
            });
          }
        }
        this.activeSessions.delete(userId);
        console.log(`[Odaklanma Bitti - ${roomName}] Kullanıcı: ${userId}, Kazanılan: ${durationMinutes} dk.`);
      }
    }

    if (roomName) {
      this.server.to(roomName).emit('presence_changed', data);
    }
  }
}