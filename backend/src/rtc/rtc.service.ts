import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MediaState {
  camera: boolean;
  mic: boolean;
  screen: boolean;
}

export interface RtcParticipant {
  userId: number;
  socketId: string;
  media: MediaState;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const EMPTY_MEDIA: MediaState = { camera: false, mic: false, screen: false };

/**
 * P2P (mesh) WebRTC icin sinyallesme durumunu tutar.
 * Medya sunucudan gecmez; sunucu yalnizca SDP/ICE mesajlarini
 * ayni video odasindaki kullanicilar arasinda tasir.
 */
@Injectable()
export class RtcService {
  // roomName -> (userId -> participant)
  private rooms = new Map<string, Map<number, RtcParticipant>>();
  // userId -> roomName (bir kullanici ayni anda tek bir aramada olabilir)
  private userRoom = new Map<number, string>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Kullaniciyi odanin aramasina ekler, odadaki diger katilimcilari dondurur.
   * Kullanici baska bir odadaysa once oradan cikarilir.
   */
  join(
    roomName: string,
    userId: number,
    socketId: string,
    allowVideo: boolean,
  ): { peers: RtcParticipant[]; previousRoom: string | null } {
    if (!allowVideo) {
      throw new ForbiddenException('Bu odada kamera ve ekran paylasimi kapali.');
    }

    let previousRoom: string | null = null;
    const currentRoom = this.userRoom.get(userId);
    if (currentRoom && currentRoom !== roomName) {
      this.leave(userId);
      previousRoom = currentRoom;
    }

    const room = this.rooms.get(roomName) ?? new Map<number, RtcParticipant>();
    this.rooms.set(roomName, room);

    const peers = Array.from(room.values()).filter((p) => p.userId !== userId);
    const existing = room.get(userId);
    room.set(userId, {
      userId,
      socketId,
      media: existing?.media ?? { ...EMPTY_MEDIA },
    });
    this.userRoom.set(userId, roomName);

    return { peers, previousRoom };
  }

  /** Kullaniciyi aramadan cikarir; ciktigi odanin adini dondurur. */
  leave(userId: number): string | null {
    const roomName = this.userRoom.get(userId);
    if (!roomName) {
      return null;
    }

    const room = this.rooms.get(roomName);
    room?.delete(userId);
    if (room && room.size === 0) {
      this.rooms.delete(roomName);
    }
    this.userRoom.delete(userId);
    return roomName;
  }

  /** Soket koptugunda: sadece o soket aramadaysa cikar. */
  leaveBySocket(userId: number, socketId: string): string | null {
    const roomName = this.userRoom.get(userId);
    const participant = roomName
      ? this.rooms.get(roomName)?.get(userId)
      : undefined;
    if (!participant || participant.socketId !== socketId) {
      return null;
    }
    return this.leave(userId);
  }

  /**
   * Sinyalin hedef sokete iletilip iletilemeyecegini kontrol eder.
   * Iki kullanici da ayni video odasinda olmak zorundadir.
   */
  resolveSignalTarget(fromUserId: number, targetUserId: number): string | null {
    if (fromUserId === targetUserId) {
      return null;
    }
    const roomName = this.userRoom.get(fromUserId);
    if (!roomName || this.userRoom.get(targetUserId) !== roomName) {
      return null;
    }
    return this.rooms.get(roomName)?.get(targetUserId)?.socketId ?? null;
  }

  updateMedia(userId: number, media: Partial<MediaState>): MediaState | null {
    const roomName = this.userRoom.get(userId);
    const participant = roomName
      ? this.rooms.get(roomName)?.get(userId)
      : undefined;
    if (!participant) {
      return null;
    }
    participant.media = {
      camera: Boolean(media.camera ?? participant.media.camera),
      mic: Boolean(media.mic ?? participant.media.mic),
      screen: Boolean(media.screen ?? participant.media.screen),
    };
    return participant.media;
  }

  getMedia(userId: number): MediaState {
    const roomName = this.userRoom.get(userId);
    const participant = roomName
      ? this.rooms.get(roomName)?.get(userId)
      : undefined;
    return participant?.media ?? { ...EMPTY_MEDIA };
  }

  getRoomOf(userId: number): string | null {
    return this.userRoom.get(userId) ?? null;
  }

  getIceServers(): IceServer[] {
    const servers: IceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    const turnUrl = this.configService.get<string>('TURN_URL');
    if (turnUrl && turnUrl.trim() !== '') {
      servers.push({
        urls: turnUrl.split(',').map((url) => url.trim()),
        username: this.configService.get<string>('TURN_USERNAME'),
        credential: this.configService.get<string>('TURN_CREDENTIAL'),
      });
    }

    return servers;
  }
}
