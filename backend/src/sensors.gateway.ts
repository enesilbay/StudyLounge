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

  // Aktif oturumları tutmak için bir Map (userId -> Başlangıç Zamanı)
  private activeSessions = new Map<number, number>();

  constructor(private readonly usersService: UsersService) {}

  @SubscribeMessage('update_presence')
  async handlePresenceUpdate(@MessageBody() payload: any) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const { userId, isAtDesk } = data;

    if (isAtDesk) {
      // 🟢 Masa Oturma: Başlangıç zamanını kaydet
      this.activeSessions.set(userId, Date.now());
      console.log(`Kullanıcı ${userId} odaklanmaya başladı.`);
    } else {
      // 🔴 Masadan Kalkma: Süreyi hesapla
      const startTime = this.activeSessions.get(userId);
      if (startTime) {
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationMinutes = Math.round(durationMs / 60000); // Milisaniyeyi dakikaya çevir

        if (durationMinutes > 0) {
          await this.usersService.addFocusTime(userId, durationMinutes);
        }
        this.activeSessions.delete(userId);
        console.log(`Kullanıcı ${userId} kalktı. Süre: ${durationMinutes} dk.`);
      }
    }

    this.server.emit('presence_changed', data);
  }
}