import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Her yerden bağlantıya izin ver
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Hem ham websocket hem de Socket.io desteği
})
export class SensorsGateway {
  @WebSocketServer()
  server!: Server;

  // Bir kullanıcı lobiye bağlandığında
  handleConnection(client: Socket) {
    console.log(`Yeni bir bağlantı: ${client.id}`);
  }

  // Kullanıcı "Masadayım" veya "Ayrıldım" sinyali gönderdiğinde
  @SubscribeMessage('update_presence')
  handlePresenceUpdate(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    // 1. Güvenlik Katmanı: Gelen veri metin (string) ise, onu JSON objesine çevir.
    // Eğer zaten objeyse (örneğin mobilden düzgün gelirse) dokunma.
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    // 2. Artık data içindeki verilere güvenle ulaşabiliriz.
    console.log(`Kullanıcı ${data?.userId} durumu: ${data?.isAtDesk}`);
    
    // 3. Bu bilgiyi odadaki (veya genel) diğer herkese yayınla
    this.server.emit('presence_changed', data);
  }
}