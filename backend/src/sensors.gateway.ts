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

  private activeSessions = new Map<number, number>();

  constructor(private readonly usersService: UsersService) {}

  // YENİ EKLENEN: Kullanıcıyı belirli bir Lobiye (Odaya) alma
  @SubscribeMessage('join_lobby')
  handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, roomName, fullName } = data;

    // Socket.io'nun doğal "Odaya Katıl" komutu
    client.join(roomName);
    console.log(`${fullName} (ID: ${userId}), '${roomName}' lobisine katıldı.`);

    // Odadaki diğer kişilere "Biri geldi" mesajı gönder (İleride ekranda göstermek için)
    this.server.to(roomName).emit('user_joined_lobby', {
      message: `${fullName} odaya katıldı.`,
      userId,
    });
  }

  @SubscribeMessage('update_presence')
  async handlePresenceUpdate(@MessageBody() payload: any) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, isAtDesk, roomName } = data; // Artık roomName de geliyor

    if (isAtDesk) {
      this.activeSessions.set(userId, Date.now());
      console.log(`[${roomName}] Kullanıcı ${userId} odaklanmaya başladı.`);
    } else {
      const startTime = this.activeSessions.get(userId);
      if (startTime) {
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationMinutes = Math.round(durationMs / 60000); // Test için 1000 yapabilirsin

        if (durationMinutes > 0) {
          const updatedUser = await this.usersService.addFocusTime(userId, durationMinutes);
          
          if (updatedUser) {
            this.server.emit('score_updated', { 
              userId: userId, 
              newTotal: updatedUser.totalFocusMinutes 
            });
          }
        }
        this.activeSessions.delete(userId);
        console.log(`[${roomName}] Kullanıcı ${userId} kalktı. Kazanılan: ${durationMinutes} Puan.`);
      }
    }

    // YENİ: Durum değişikliğini SADECE o odadaki kişilere bildir (Tüm dünyaya değil)
    if (roomName) {
      this.server.to(roomName).emit('presence_changed', data);
    }
  }
}