import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Kullanicinin butun soketlerinin katildigi socket.io odasi. */
export const userRoom = (userId: number) => `user:${userId}`;

/**
 * Gateway disindaki servislerin (moderasyon, yonetim, arkadaslik) canli
 * baglantiya ulasmasi icin ince bir kopru. Gateway acilista `attach` ile
 * sunucuyu verir; boylece moduller arasinda dongusel bagimlilik olusmaz.
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attach(server: Server) {
    this.server = server;
  }

  /** Kullanicinin acik butun sekmelerine olay gonderir. */
  emitToUser(userId: number, event: string, payload?: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  /** Kullanicinin butun soketlerini kapatir (yasak, hesap silme, sifre degisimi). */
  disconnectUser(userId: number, reason?: string) {
    if (!this.server) return;
    if (reason) this.server.to(userRoom(userId)).emit('force_logout', { reason });
    this.server.in(userRoom(userId)).disconnectSockets(true);
  }
}
