import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from './users/users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class SensorsGateway {
  @WebSocketServer() server!: Server;

  // Kullanıcıların aktif çalışma seanslarını takip etmek için
  private activeSessions = new Map<number, number>();

  constructor(private readonly usersService: UsersService) {}

  // KULLANICIYI LOBİYE (ODAYA) ALMA
  @SubscribeMessage('join_lobby')
  handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, roomName, fullName } = data;

    // Socket.io "Rooms" özelliğini kullanarak kullanıcıyı odaya dahil et
    client.join(roomName);
    console.log(`[Lobi Katılım] ${fullName} (ID: ${userId}), '${roomName}' lobisine girdi.`);

    // Odadaki diğer kullanıcılara yeni birinin geldiğini bildir
    this.server.to(roomName).emit('user_joined_lobby', {
      message: `${fullName} odaya katıldı.`,
      userId,
    });
  }

  // GLOBAL CHAT - MESAJ GÖNDERME VE DAĞITMA
  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, fullName, roomName, text } = data;

    console.log(`[Chat - ${roomName}] ${fullName}: ${text}`);

    // Mesajı SADECE ilgili lobiye (odaya) bağlı olanlara ilet
    this.server.to(roomName).emit('receive_message', {
      userId,
      fullName,
      text,
      timestamp: new Date().toISOString(),
    });
  }

  // ODAKLANMA DURUMU VE PUANLAMA TAKİBİ
  @SubscribeMessage('update_presence')
  async handlePresenceUpdate(@MessageBody() payload: any) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, isAtDesk, roomName } = data;

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

    // Durum değişikliğini (masada/değil) sadece odadaki arkadaşlarına bildir
    if (roomName) {
      this.server.to(roomName).emit('presence_changed', data);
    }
  }
}