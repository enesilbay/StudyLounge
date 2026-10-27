import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  Ack,
  OnGatewayInit,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { HttpException, UseFilters } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { Server, Socket } from 'socket.io';
import { UsersService } from './users/users.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './config/env';
import { parseCorsOrigins } from './config/cors';
import { JwtPayload } from './auth/jwt-payload.interface';
import { LobbiesService } from './lobbies/lobbies.service';
import { MessagesService } from './messages/messages.service';
import { MediaState, RtcService } from './rtc/rtc.service';
import { WhiteboardService } from './whiteboard/whiteboard.service';
import { RoomTimerService } from './room-timer/room-timer.service';
import { StudyService } from './study/study.service';
import { ModerationService } from './moderation/moderation.service';
import { RealtimeService, userRoom } from './realtime/realtime.service';
import { STORAGE_KEY_PATTERN } from './storage/storage.service';
import { BADGE_NAMES } from './users/badges';
import { reportUnexpected } from './common/report-error';

interface JoinLobbyDto {
  roomName: string;
  fullName?: string;
  maxUsers?: number;
}

interface SendMessageDto {
  fullName?: string;
  roomName: string;
  text: string;
  type?: string;
  fileUrl?: string;
  isPremium?: boolean;
}

interface SendDmDto {
  targetUserId: number;
  text: string;
  type?: string;
  fileUrl?: string;
}

/** `send_dm` ack yaniti: basarida kaydedilen mesaj, hatada Turkce hata metni. */
type DmAck = (
  response: { ok: true; message: unknown } | { ok: false; error: string },
) => void;

interface UpdatePresenceDto {
  isAtDesk: boolean;
  roomName: string;
  /** Web: oturumun dersi (istege bagli; mobil gondermez). */
  subjectId?: number | null;
  /** Web istemcisi 'web' gonderir; gonderilmezse mobil sayilir. */
  source?: 'web' | 'mobile';
}

interface ActiveFocusSession {
  startedAt: number;
  subjectId: number | null;
  source: 'web' | 'mobile';
}

interface NudgeFriendDto {
  targetUserId: number;
  senderName?: string;
  roomName?: string;
}

interface ConnectedRoomUser {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
  equippedProfileFrame?: string | null;
  equippedBubbleColor?: string | null;
  equippedIcon?: string | null;
  equippedLampColor?: string | null;
  roomName: string;
  isAtDesk: boolean;
  isEliteRoom: boolean;
  isPremium: boolean;
}

interface RtcJoinDto {
  roomName: string;
}

interface RtcSignalDto {
  targetUserId: number;
  data: unknown;
}

interface BoardOpenDto {
  /** true ise PDF'siz bos beyaz tahta acilir. */
  blank?: boolean;
  fileUrl?: string;
  fileName?: string;
}

interface RoomTimerStartDto {
  focusMinutes: number;
  breakMinutes: number;
}

interface TokenBucket {
  tokens: number;
  updatedAt: number;
}

const MAX_CHAT_MESSAGE_LENGTH = 2000;
const CHAT_TYPES = ['text', 'image', 'file'];
const FILE_TYPES = ['image', 'file'];
const GENERIC_ERROR = 'Bir şeyler ters gitti, tekrar dene.';
const CONTROL_DENIED = 'Bunu yalnızca başlatan kişi ya da oda sahibi yapabilir.';
const RATE_LIMIT_ERROR = 'Çok hızlı işlem yapıyorsun, biraz yavaşla.';

/** Tek bir odak oturumundan en fazla bu kadar dakika yazilir (Elite carpani dahil). */
export const MAX_SESSION_MINUTES = 240;
/** Arkadaslara "masaya gecti" bildirimi kullanici basina bu sureden sik gitmez. */
const DESK_NOTICE_COOLDOWN_MS = 30 * 60_000;
/** Ayni arkadasi tekrar durtmek icin beklenecek sure. */
const NUDGE_COOLDOWN_MS = 60_000;
/** Socket basina token bucket: ani en fazla 10 islem, saniyede 2 islem yenilenir. */
const BUCKET_CAPACITY = 10;
const BUCKET_REFILL_PER_SECOND = 2;

const MAX_ATMOSPHERE_CHANNELS = 10;
const ATMOSPHERE_KEY = /^[\w-]{1,24}$/;

/** Yalnizca bizim yukleme ucumuzun verdigi "/uploads/<anahtar>" adresleri kabul edilir. */
const isUploadUrl = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('/uploads/') &&
  STORAGE_KEY_PATTERN.test(value.slice('/uploads/'.length));

// Global filtreler gateway'lere uygulanmaz; beklenmeyen socket hatalari da Sentry'ye gitsin.
@UseFilters(new SentryGlobalFilter())
@WebSocketGateway({
  cors: {
    origin:
      parseCorsOrigins(
        process.env.CORS_ORIGIN,
        process.env.CORS_ORIGIN_PATTERN,
      ) ?? '*',
  },
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class SensorsGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection
{
  @WebSocketServer() server!: Server;

  /** Odak oturumlari SOKET bazinda tutulur: her sekmenin kendi odasi ve carpani vardir. */
  private activeSessions = new Map<string, ActiveFocusSession>();
  private connectedUsers = new Map<string, ConnectedRoomUser>();
  private userSockets = new Map<number, Set<string>>();
  private buckets = new Map<string, TokenBucket>();
  private lastDeskNotice = new Map<number, number>();
  private lastNudge = new Map<string, number>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly lobbiesService: LobbiesService,
    private readonly messagesService: MessagesService,
    private readonly rtcService: RtcService,
    private readonly whiteboardService: WhiteboardService,
    private readonly roomTimerService: RoomTimerService,
    private readonly studyService: StudyService,
    private readonly moderationService: ModerationService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: unknown } | undefined;
      const token = typeof auth?.token === 'string' ? auth.token : undefined;
      if (!token) {
        throw new Error('Token eksik');
      }

      const payload = this.jwtService.verify<JwtPayload & { tv?: number }>(
        token,
        { secret: getJwtSecret(this.configService) },
      );

      (client.data as Record<string, unknown>).user = payload;

      const userId = payload.sub;
      const dbUser = await this.usersService.findById(userId);
      if (!dbUser) {
        throw new Error('Kullanici yok');
      }
      // Sifre degisince/sifirlaninca surum artar; eski token'li soket baglanamaz.
      const currentVersion = dbUser.tokenVersion ?? 0;
      if ((payload.tv ?? 0) !== currentVersion) {
        throw new Error('Token iptal edilmis');
      }
      // Askıdaki hesap bağlanamaz.
      if (await this.moderationService.isBanned(userId)) {
        throw new Error('Hesap askida');
      }

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      // Kullaniciya ozel odaya katilir: RealtimeService (yasak, arkadaslik bildirimi) buradan ulasir.
      await client.join(userRoom(userId));

      // Global olarak çevrimiçi işaretle
      await this.usersService.setOnlineStatus(userId, true);
      void this.usersService.touchLastSeen(userId);
    } catch {
      console.log('[Socket] Yetkisiz baglanti denemesi reddedildi.');
      (client.data as Record<string, unknown>).user = undefined;
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.buckets.delete(client.id);
    const payload = (client.data as { user?: JwtPayload }).user;
    const userId = payload?.sub;
    if (userId) {
      this.leaveCall(userId, client.id);
    }

    const user = this.connectedUsers.get(client.id);
    if (user) {
      try {
        await this.finishFocusSession(client.id, user);
      } catch (error) {
        reportUnexpected(error, 'session_record');
      }
      this.connectedUsers.delete(client.id);
      this.broadcastRoomUsers(user.roomName);
      console.log(`[Baglanti Koptu] ${user.fullName} lobiden ayrildi.`);
    }

    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          this.lastDeskNotice.delete(userId);
          // Global olarak çevrimdışı işaretle
          await this.usersService.setOnlineStatus(userId, false);
        } else if (user) {
          // Baska sekme acik: odasi o sekmenin odasi olarak kalir.
          await this.syncCurrentRoom(userId);
        }
      }
    }
  }

  private getSocketUser(client: Socket): JwtPayload | null {
    const user = (client.data as Record<string, unknown>).user as
      | JwtPayload
      | undefined;
    return user?.sub ? user : null;
  }

  /** Bozuk JSON ya da nesne olmayan gövde bos nesneye doner; hicbir zaman firlatmaz. */
  private parsePayload<T>(payload: T | string): T {
    let value: unknown = payload;
    if (typeof payload === 'string') {
      try {
        value = JSON.parse(payload);
      } catch {
        return {} as T;
      }
    }
    return value && typeof value === 'object' ? (value as T) : ({} as T);
  }

  /** Socket basina token bucket; false donerse islem reddedilir. */
  private takeToken(client: Socket, cost = 1): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(client.id) ?? {
      tokens: BUCKET_CAPACITY,
      updatedAt: now,
    };
    bucket.tokens = Math.min(
      BUCKET_CAPACITY,
      bucket.tokens + ((now - bucket.updatedAt) / 1000) * BUCKET_REFILL_PER_SECOND,
    );
    bucket.updatedAt = now;
    const allowed = bucket.tokens >= cost;
    if (allowed) bucket.tokens -= cost;
    this.buckets.set(client.id, bucket);
    return allowed;
  }

  /**
   * Istemciye giden hata metni: yalnizca bilincli (HttpException) mesajlar gider,
   * digerleri Sentry'ye raporlanir ve genel metne cevrilir.
   */
  private errorMessage(error: unknown, context: string): string {
    if (error instanceof HttpException) {
      return error.message;
    }
    reportUnexpected(error, context);
    return GENERIC_ERROR;
  }

  /** Kullanicinin veritabaninda gorunen odasini acik soketlerine gore yeniler. */
  private async syncCurrentRoom(userId: number) {
    if (!this.userSockets.has(userId)) return;
    const roomName =
      Array.from(this.connectedUsers.values()).find((u) => u.userId === userId)
        ?.roomName ?? null;
    try {
      await this.usersService.setOnlineStatus(userId, true, roomName);
    } catch (error) {
      reportUnexpected(error, 'socket');
    }
  }

  private broadcastRoomUsers(roomName: string) {
    const usersInRoom = Array.from(this.connectedUsers.values()).filter(
      (u) => u.roomName === roomName,
    );
    if (usersInRoom.length === 0) {
      this.whiteboardService.scheduleDrop(roomName);
      this.roomTimerService.scheduleDrop(roomName);
    } else {
      this.whiteboardService.cancelDrop(roomName);
      this.roomTimerService.cancelDrop(roomName);
    }
    const focusedCount = usersInRoom.filter((user) => user.isAtDesk).length;
    void this.lobbiesService.updateActiveUsers(roomName, focusedCount);

    // Web istemcileri icin kamera/mikrofon/ekran durumu eklenir; mobil bu alanlari yok sayar.
    const payload = usersInRoom.map((user) => {
      const media: MediaState | null =
        this.rtcService.getRoomOf(user.userId) === roomName
          ? this.rtcService.getMedia(user.userId)
          : null;
      return {
        ...user,
        isInCall: media !== null,
        isCameraOn: media?.camera ?? false,
        isMicOn: media?.mic ?? false,
        isScreenSharing: media?.screen ?? false,
      };
    });
    this.server.to(roomName).emit('room_users', payload);
  }

  private async finishFocusSession(socketId: string, user: ConnectedRoomUser) {
    const session = this.activeSessions.get(socketId);
    if (!session) {
      return;
    }
    // Ayni oturum iki kez kapatilmasin (ornegin ayrilma ve kopma ust uste gelirse).
    this.activeSessions.delete(socketId);
    const endedAt = Date.now();

    // Yalnizca tam dakikalar yazilir; 30 sn'lik tiklamalarla puan kasilamaz.
    let durationMinutes = Math.floor((endedAt - session.startedAt) / 60000);
    if (user.isEliteRoom) {
      durationMinutes *= 2;
    }
    durationMinutes = Math.min(durationMinutes, MAX_SESSION_MINUTES);

    if (durationMinutes > 0) {
      const updatedUser = await this.usersService.addFocusTime(
        user.userId,
        durationMinutes,
      );

      if (updatedUser) {
        this.server.emit('score_updated', {
          userId: user.userId,
          newTotal: updatedUser.totalFocusMinutes,
        });
        for (const badge of updatedUser.newBadges) {
          this.emitToUser(user.userId, 'badge_earned', { badge });
        }
      }

      // Oturum gecmisi; hata olursa odak puani yine de yazilmis olur.
      try {
        await this.studyService.recordSession({
          userId: user.userId,
          subjectId: session.subjectId,
          roomName: user.roomName,
          startedAt: new Date(session.startedAt),
          endedAt: new Date(endedAt),
          creditedMinutes: durationMinutes,
          source: session.source,
        });
        if (
          session.subjectId &&
          (await this.studyService.subjectMinutes(
            user.userId,
            session.subjectId,
          )) >= 600
        ) {
          await this.awardBadge(user.userId, BADGE_NAMES.subjectMaster);
        }
      } catch (error) {
        console.error('[Oturum kaydi] Hata:', error);
        reportUnexpected(error, 'session_record');
      }
    }
  }

  /** Rozeti verir; yeni kazanıldıysa kullanıcıya bildirir (istege bagli event). */
  private async awardBadge(userId: number, badge: string) {
    if (await this.usersService.awardBadge(userId, badge)) {
      this.emitToUser(userId, 'badge_earned', { badge });
    }
  }

  private emitToUser(userId: number, event: string, payload: unknown) {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  @SubscribeMessage('join_lobby')
  async handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinLobbyDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    const { roomName, maxUsers } = data;
    if (typeof roomName !== 'string' || !roomName.trim()) {
      client.emit('join_lobby_error', { message: 'Oda adı geçersiz.' });
      return;
    }

    try {
      const currentUser = await this.usersService.findById(socketUser.sub);
      if (!currentUser) {
        client.disconnect();
        return;
      }

      const lobby = await this.lobbiesService.assertUserCanEnter(
        roomName,
        socketUser.sub,
      );
      const fullName = currentUser.fullName ?? socketUser.username;

      // Kapasite sunucudaki lobi kaydindan okunur (video odalari 6 kisiyle sinirli).
      const capacity = lobby.maxUsers ?? maxUsers;
      const usersInRoom = Array.from(this.connectedUsers.values()).filter(
        (u) => u.roomName === roomName && u.userId !== socketUser.sub,
      );

      if (capacity && usersInRoom.length >= capacity) {
        client.emit('room_full', { message: 'Bu oda kapasitesine ulaştı.' });
        client.emit('join_lobby_error', { message: 'Bu oda dolu.' });
        return;
      }

      // Ayni soketle baska bir odaya gecildiyse once eski odadan cik.
      const previous = this.connectedUsers.get(client.id);
      if (previous && previous.roomName !== roomName) {
        await this.leaveLobby(client, previous);
      }

      void client.join(roomName);

      this.connectedUsers.set(client.id, {
        userId: socketUser.sub,
        fullName,
        avatarUrl: currentUser.avatarUrl,
        equippedProfileFrame: currentUser.equippedProfileFrame,
        equippedBubbleColor: currentUser.equippedBubbleColor,
        equippedIcon: currentUser.equippedIcon,
        equippedLampColor: currentUser.equippedLampColor,
        roomName,
        isAtDesk: false,
        isEliteRoom: lobby.isPremiumOnly,
        isPremium: currentUser.isPremium,
      });

      console.log(
        `[Lobi Katilim] ${fullName} (ID: ${socketUser.sub}), '${roomName}' lobisine girdi.`,
      );

      await this.usersService.setOnlineStatus(socketUser.sub, true, roomName);

      this.broadcastRoomUsers(roomName);
      this.server.to(roomName).emit('user_joined_lobby', {
        fullName,
        userId: socketUser.sub,
      });

      // Web: odada acik bir PDF tahtasi varsa yeni gelen kisiye gonderilir.
      const board = this.whiteboardService.getState(roomName);
      if (board) {
        client.emit('board_state', { board });
      }
      // Web: calisan ortak Pomodoro sayaci da gonderilir.
      const timer = this.roomTimerService.snapshot(roomName);
      if (timer) {
        client.emit('room_timer', { timer, action: 'sync' });
      }
    } catch (error) {
      client.emit('join_lobby_error', {
        message: this.errorMessage(error, 'socket'),
      });
    }
  }

  private async leaveLobby(client: Socket, user: ConnectedRoomUser) {
    try {
      await this.finishFocusSession(client.id, user);
    } catch (error) {
      reportUnexpected(error, 'session_record');
    }
    this.leaveCall(user.userId, client.id);
    void client.leave(user.roomName);
    this.connectedUsers.delete(client.id);
    this.broadcastRoomUsers(user.roomName);
    // Kisi artik hicbir sekmede o odada degilse "odada" sayilmaya devam etmez.
    await this.syncCurrentRoom(user.userId);
  }

  // Web: sayfadan ayrilirken soket acik kaldigi icin odadan acikca cikilir.
  @SubscribeMessage('leave_lobby')
  async handleLeaveLobby(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    await this.leaveLobby(client, user);
    console.log(`[Lobi Ayrilis] ${user.fullName}, '${user.roomName}' lobisinden ayrildi.`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    if (!this.takeToken(client)) {
      client.emit('error', { message: RATE_LIMIT_ERROR });
      return;
    }
    const connectedUser = this.connectedUsers.get(client.id);
    // Yalnizca bu sokette join_lobby ile girilmis odaya mesaj yazilabilir.
    if (!connectedUser || connectedUser.roomName !== data.roomName) {
      client.emit('error', { message: 'Mesaj göndermek için önce odaya katılmalısın.' });
      return;
    }
    const type = data.type ?? 'text';
    const hasFile = data.fileUrl !== undefined && data.fileUrl !== null;
    if (
      typeof data.text !== 'string' ||
      data.text.length > MAX_CHAT_MESSAGE_LENGTH ||
      typeof type !== 'string' ||
      !CHAT_TYPES.includes(type) ||
      (hasFile ? !FILE_TYPES.includes(type) : type !== 'text' || !data.text.trim())
    ) {
      client.emit('error', { message: 'Mesaj geçersiz ya da çok uzun.' });
      return;
    }
    if (hasFile && !isUploadUrl(data.fileUrl)) {
      client.emit('error', { message: 'Dosya adresi geçersiz.' });
      return;
    }
    let fileMessage: { id: number; type: string } | null = null;
    try {
      await this.moderationService.assertCanChat(socketUser.sub);
      if (hasFile) {
        // Dosya, gonderenin bu odaya az once yukledigi kayitla eslesmeli.
        const upload = await this.messagesService.findOwnFileMessage(
          socketUser.sub,
          data.roomName,
          data.fileUrl as string,
        );
        if (!upload) {
          client.emit('error', { message: 'Dosya bulunamadı, tekrar yükle.' });
          return;
        }
        fileMessage = { id: upload.id, type: upload.type ?? type };
      }
    } catch (error) {
      client.emit('error', { message: this.errorMessage(error, 'socket') });
      return;
    }
    const fullName = connectedUser.fullName;

    console.log(`[Chat - ${data.roomName}] ${fullName}: ${data.text}`);

    let savedMessage: Awaited<ReturnType<MessagesService['createMessage']>> | null = null;
    try {
      savedMessage = hasFile
        ? null
        : await this.messagesService.createMessage(
            data.text,
            data.roomName,
            socketUser.sub,
          );
    } catch (error) {
      client.emit('error', { message: this.errorMessage(error, 'socket') });
      return;
    }

    this.server.to(data.roomName).emit('receive_message', {
      id: savedMessage?.id ?? fileMessage?.id,
      roomName: data.roomName,
      userId: socketUser.sub,
      fullName,
      user: savedMessage?.user,
      avatarUrl: connectedUser?.avatarUrl,
      equippedProfileFrame: connectedUser?.equippedProfileFrame,
      equippedBubbleColor: connectedUser?.equippedBubbleColor,
      equippedIcon: connectedUser?.equippedIcon,
      text: data.text,
      type: fileMessage?.type ?? type,
      fileUrl: hasFile ? data.fileUrl : undefined,
      isPremium: connectedUser?.isPremium ?? false,
      createdAt: savedMessage?.createdAt ?? new Date().toISOString(),
      timestamp: savedMessage?.createdAt ?? new Date().toISOString(),
    });
  }

  /** `send_dm` hatasi: ack varsa onunla, yoksa eski `error` event'iyle bildirilir. */
  private failDm(client: Socket, ack: DmAck | undefined, message: string) {
    if (typeof ack === 'function') {
      ack({ ok: false, error: message });
    } else {
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('send_dm')
  async handleSendDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendDmDto | string,
    @Ack() ack?: DmAck,
  ) {
    try {
      const socketUser = this.getSocketUser(client);
      if (!socketUser) {
        this.failDm(client, ack, 'Oturum geçersiz.');
        return;
      }

      const data = this.parsePayload(payload);
      if (!this.takeToken(client)) {
        this.failDm(client, ack, RATE_LIMIT_ERROR);
        return;
      }

      const targetUserId = Number(data.targetUserId);
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      const type = data.type ?? 'text';
      const hasFile = data.fileUrl !== undefined && data.fileUrl !== null;
      if (
        !Number.isInteger(targetUserId) ||
        targetUserId <= 0 ||
        targetUserId === socketUser.sub
      ) {
        this.failDm(client, ack, 'Alıcı geçersiz.');
        return;
      }
      if (
        !text ||
        text.length > MAX_CHAT_MESSAGE_LENGTH ||
        typeof type !== 'string' ||
        !CHAT_TYPES.includes(type) ||
        (hasFile ? !FILE_TYPES.includes(type) : type !== 'text')
      ) {
        this.failDm(
          client,
          ack,
          `Mesaj 1 ile ${MAX_CHAT_MESSAGE_LENGTH} karakter arasında olmalı.`,
        );
        return;
      }
      if (hasFile && !isUploadUrl(data.fileUrl)) {
        this.failDm(client, ack, 'Dosya adresi geçersiz.');
        return;
      }

      await this.moderationService.assertCanChat(socketUser.sub);
      await this.moderationService.assertNotBlocked(
        socketUser.sub,
        targetUserId,
        'Bu kullanıcıya mesaj gönderemezsin.',
      );
      const target = await this.usersService.findById(targetUserId);
      if (!target) {
        this.failDm(client, ack, 'Kullanıcı bulunamadı.');
        return;
      }

      const sender = await this.usersService.findById(socketUser.sub);
      const senderName = sender?.fullName ?? socketUser.username;
      const senderUsername = sender?.username ?? socketUser.username;
      const fileUrl = hasFile ? (data.fileUrl as string) : undefined;
      const savedMsg = await this.messagesService.createDirectMessage(
        socketUser.sub,
        targetUserId,
        text,
        type,
        fileUrl,
      );

      const dmPayload = {
        id: savedMsg.id,
        senderId: socketUser.sub,
        receiverId: targetUserId,
        text,
        type,
        fileUrl,
        createdAt: savedMsg.createdAt || new Date(),
        senderName,
        senderUsername,
      };

      // Alıcıya ve göndericinin açık tüm sekmelerine (kendi ekranında çıksın)
      this.emitToUser(targetUserId, 'receive_dm', dmPayload);
      this.emitToUser(socketUser.sub, 'receive_dm', dmPayload);
      if (typeof ack === 'function') {
        ack({ ok: true, message: dmPayload });
      }

      try {
        const tokens = await this.usersService.getUserPushTokens([targetUserId]);
        tokens.forEach((token) => {
          void this.notificationsService.sendNotification(
            token,
            'Yeni mesaj',
            `${senderName} sana bir mesaj gönderdi.`,
            {
              type: 'dm',
              targetUserId: socketUser.sub,
              targetName: senderName,
              targetUsername: senderUsername,
              targetAvatarUrl: sender?.avatarUrl,
              targetProfileFrame: sender?.equippedProfileFrame,
            },
          );
        });
      } catch (error) {
        reportUnexpected(error, 'dm_push');
      }
    } catch (error) {
      console.error('DM Gönderim Hatası:', error);
      this.failDm(client, ack, this.errorMessage(error, 'dm_send'));
    }
  }

  @SubscribeMessage('update_presence')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdatePresenceDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    const user = this.connectedUsers.get(client.id);
    if (!user || typeof data.isAtDesk !== 'boolean') {
      return;
    }

    user.isAtDesk = data.isAtDesk;
    this.connectedUsers.set(client.id, user);
    this.broadcastRoomUsers(user.roomName);

    if (data.isAtDesk) {
      const subjectId = typeof data.subjectId === 'number' ? data.subjectId : null;
      const active = this.activeSessions.get(client.id);
      if (active && active.subjectId === subjectId) {
        // Zaten odakta: baslangic sifirlanmaz (aksi halde birikmis sure kaybolurdu).
        this.emitPresence(user, true, socketUser.sub);
        return;
      }
      if (active) {
        // Ders degisti: onceki oturum kapanir, yenisi yeni dersle baslar.
        await this.finishFocusSession(client.id, user);
      }
      // Ayni anda tek aktif oturum: baska sekmedeki acik oturum kapanir (suresi yazilir).
      await this.closeOtherSessions(socketUser.sub, client.id);
      this.activeSessions.set(client.id, {
        startedAt: Date.now(),
        subjectId,
        source: data.source === 'web' ? 'web' : 'mobile',
      });
      console.log(
        `[Odaklanma Basladi - ${user.roomName}] Kullanici: ${socketUser.sub} (Elite: ${user.isEliteRoom})`,
      );

      this.notifyFriendsAtDesk(socketUser.sub, user.fullName);
    } else {
      await this.finishFocusSession(client.id, user);
      console.log(
        `[Odaklanma Bitti - ${user.roomName}] Kullanici: ${socketUser.sub} (Elite: ${user.isEliteRoom})`,
      );
    }

    this.emitPresence(user, data.isAtDesk, socketUser.sub);
  }

  /** Kullanicinin diger soketlerindeki acik oturumlari kapatir ve o sekmelere haber verir. */
  private async closeOtherSessions(userId: number, exceptSocketId: string) {
    for (const socketId of Array.from(this.activeSessions.keys())) {
      const other = this.connectedUsers.get(socketId);
      if (socketId === exceptSocketId || other?.userId !== userId) continue;
      other.isAtDesk = false;
      try {
        await this.finishFocusSession(socketId, other);
      } catch (error) {
        reportUnexpected(error, 'session_record');
      }
      this.server.to(socketId).emit('focus_moved', { roomName: this.connectedUsers.get(exceptSocketId)?.roomName });
      this.broadcastRoomUsers(other.roomName);
    }
  }

  private emitPresence(user: ConnectedRoomUser, isAtDesk: boolean, userId: number) {
    this.server.to(user.roomName).emit('presence_changed', {
      isAtDesk,
      roomName: user.roomName,
      userId,
      isEliteRoom: user.isEliteRoom,
    });
  }

  /** Arkadaslara "masaya gecti" bildirimi; kullanici basina 30 dakikada en fazla bir kez. */
  private notifyFriendsAtDesk(userId: number, fullName: string) {
    const now = Date.now();
    const last = this.lastDeskNotice.get(userId) ?? 0;
    if (now - last < DESK_NOTICE_COOLDOWN_MS) return;
    this.lastDeskNotice.set(userId, now);

    void this.usersService
      .getFriendsPushTokens(userId)
      .then((tokens) => {
        tokens.forEach((token) => {
          void this.notificationsService.sendNotification(
            token,
            'StudyLounge',
            `${fullName} masaya geçti, beraber çalışabilirsiniz!`,
          );
        });
      })
      .catch((error) => reportUnexpected(error, 'desk_notice'));
  }

  @SubscribeMessage('nudge_friend')
  async handleNudge(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: NudgeFriendDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) {
      client.disconnect();
      return;
    }

    const data = this.parsePayload(payload);
    if (!this.takeToken(client)) {
      client.emit('error', { message: RATE_LIMIT_ERROR });
      return;
    }
    const connectedUser = this.connectedUsers.get(client.id);
    if (!connectedUser) {
      client.emit('error', { message: 'Dürtmek için önce bir odaya katılmalısın.' });
      return;
    }
    const targetUserId = Number(data.targetUserId);
    if (
      !Number.isInteger(targetUserId) ||
      targetUserId <= 0 ||
      targetUserId === socketUser.sub
    ) {
      client.emit('error', { message: 'Bu kullanıcıyı dürtemezsin.' });
      return;
    }

    try {
      if (await this.moderationService.isBlockedEitherWay(socketUser.sub, targetUserId)) {
        client.emit('error', { message: 'Bu kullanıcıyı dürtemezsin.' });
        return;
      }
      const friendship = await this.usersService.friendshipStatus(
        socketUser.sub,
        targetUserId,
      );
      if (friendship.status !== 'friends') {
        client.emit('error', { message: 'Yalnızca arkadaşlarını dürtebilirsin.' });
        return;
      }
    } catch (error) {
      client.emit('error', { message: this.errorMessage(error, 'nudge') });
      return;
    }

    // Zaten ayni odadaki arkadas durtulmez.
    const roomName = connectedUser.roomName;
    const alreadyInRoom = Array.from(this.connectedUsers.values()).some(
      (u) => u.userId === targetUserId && u.roomName === roomName,
    );
    if (alreadyInRoom) {
      client.emit('error', { message: 'Bu arkadaşın zaten bu odada.' });
      return;
    }
    const now = Date.now();
    const pairKey = `${socketUser.sub}:${targetUserId}`;
    if (now - (this.lastNudge.get(pairKey) ?? 0) < NUDGE_COOLDOWN_MS) {
      client.emit('error', { message: 'Bu arkadaşını az önce dürttün, biraz bekle.' });
      return;
    }
    if (this.lastNudge.size > 2000) {
      for (const [key, at] of this.lastNudge) {
        if (now - at >= NUDGE_COOLDOWN_MS) this.lastNudge.delete(key);
      }
    }
    this.lastNudge.set(pairKey, now);

    const senderName = connectedUser.fullName;
    console.log(
      `[Nudge] ${senderName} (ID: ${socketUser.sub}), Kullanici ${targetUserId}'yi durtuyor.`,
    );

    this.emitToUser(targetUserId, 'nudge_received', {
      senderName,
      senderId: socketUser.sub,
      roomName,
      message: `${senderName} seni ${roomName} odasına davet ediyor!`,
    });

    try {
      const tokens = await this.usersService.getUserPushTokens([targetUserId]);
      tokens.forEach((token) => {
        void this.notificationsService.sendNotification(
          token,
          'StudyLounge',
          `${senderName} seni ${roomName} odasına davet ediyor!`,
          {
            type: 'room_invite',
            roomName,
            senderId: socketUser.sub,
            senderName,
          },
        );
      });
    } catch (e) {
      console.error('[Nudge] Push bildirimi gonderilemedi:', e);
      reportUnexpected(e, 'nudge_push');
    }
  }

  // ── AŞAMA 6: SENKRONİZE ATMOSFER (PREMIUM) ──
  @SubscribeMessage('broadcast_atmosphere')
  async handleBroadcastAtmosphere(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { volumes: Record<string, number>; roomName?: string } | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;
    if (!this.takeToken(client)) {
      client.emit('error', { message: RATE_LIMIT_ERROR });
      return;
    }

    // Oda adi istemciden degil, soketin gercekten bulundugu odadan alinir.
    const room = this.connectedUsers.get(client.id);
    if (!room) return;

    // Sadece Premium kullanıcılar yayın yapabilir
    const user = await this.usersService.findById(socketUser.sub);
    if (!user?.isPremium) {
      client.emit('error', { message: 'Atmosfer senkronizasyonu için Premium gereklidir.' });
      return;
    }

    const data = this.parsePayload(payload);
    const entries =
      data.volumes && typeof data.volumes === 'object' && !Array.isArray(data.volumes)
        ? Object.entries(data.volumes)
        : [];
    if (entries.length === 0 || entries.length > MAX_ATMOSPHERE_CHANNELS) {
      client.emit('error', { message: 'Ses ayarları geçersiz.' });
      return;
    }
    const volumes: Record<string, number> = {};
    for (const [key, value] of entries) {
      const volume = Number(value);
      if (!ATMOSPHERE_KEY.test(key) || !Number.isFinite(volume)) {
        client.emit('error', { message: 'Ses ayarları geçersiz.' });
        return;
      }
      volumes[key] = Math.max(0, Math.min(100, Math.round(volume)));
    }

    // Odadaki diğer kullanıcılara (kendisi hariç) ayarları gönder
    client.to(room.roomName).emit('atmosphere_updated', {
      ownerId: socketUser.sub,
      ownerName: user.fullName,
      volumes,
    });
  }

  // ── ODA SAHIBI KONTROLLERI (istege bagli event'ler; mobil yok sayar) ──
  private socketsInRoom(roomName: string) {
    return Array.from(this.connectedUsers.entries()).filter(([, u]) => u.roomName === roomName);
  }

  /** Kisiyi odadan cikarir; 15 dakika ayni odaya giremez. */
  @SubscribeMessage('kick_user')
  async handleKickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: number } | string,
  ) {
    const owner = this.connectedUsers.get(client.id);
    if (!owner) return;
    const data = this.parsePayload(payload) as { targetUserId: number };
    try {
      await this.lobbiesService.kick(owner.roomName, owner.userId, Number(data?.targetUserId));
    } catch (error) {
      client.emit('error', { message: this.errorMessage(error, 'socket') });
      return;
    }
    for (const [socketId, roomUser] of this.socketsInRoom(owner.roomName)) {
      if (roomUser.userId !== Number(data.targetUserId)) continue;
      const targetSocket = this.server.sockets.sockets.get(socketId);
      this.server.to(socketId).emit('kicked', { roomName: owner.roomName, message: `${owner.fullName} seni odadan çıkardı.` });
      if (targetSocket) await this.leaveLobby(targetSocket, roomUser);
    }
    client.emit('room_notice', { message: 'Kişi odadan çıkarıldı.' });
  }

  /** Odayi yeni girislere kilitler ya da acar; o an odada olanlar geri girebilir. */
  @SubscribeMessage('lock_lobby')
  async handleLockLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { locked: boolean } | string,
  ) {
    const owner = this.connectedUsers.get(client.id);
    if (!owner) return;
    const locked = Boolean((this.parsePayload(payload) as { locked: boolean })?.locked);
    try {
      const members = this.socketsInRoom(owner.roomName).map(([, u]) => u.userId);
      await this.lobbiesService.setLocked(owner.roomName, owner.userId, locked, members);
    } catch (error) {
      client.emit('error', { message: this.errorMessage(error, 'socket') });
      return;
    }
    this.server.to(owner.roomName).emit('lobby_updated', { roomName: owner.roomName, isLocked: locked });
  }

  /** Odayi kapatir: herkes cikarilir ve oda silinir. */
  @SubscribeMessage('close_lobby')
  async handleCloseLobby(@ConnectedSocket() client: Socket) {
    const owner = this.connectedUsers.get(client.id);
    if (!owner) return;
    try {
      await this.lobbiesService.findOwnedLobby({ name: owner.roomName }, owner.userId);
    } catch (error) {
      client.emit('error', { message: this.errorMessage(error, 'socket') });
      return;
    }
    const roomName = owner.roomName;
    this.server.to(roomName).emit('lobby_closed', { roomName, message: `${owner.fullName} odayı kapattı.` });
    for (const [socketId, roomUser] of this.socketsInRoom(roomName)) {
      const roomSocket = this.server.sockets.sockets.get(socketId);
      if (roomSocket) await this.leaveLobby(roomSocket, roomUser);
    }
    await this.lobbiesService.close(roomName, owner.userId);
  }

  // ── YONETICI (AdminRoomsService cagirir) ──

  /** Odada o an bagli olan kullanici kimlikleri. */
  roomMemberIds(roomName: string): number[] {
    return this.socketsInRoom(roomName).map(([, u]) => u.userId);
  }

  /** Kilit durumunu odadakilere bildirir. */
  announceRoomLock(roomName: string, locked: boolean) {
    this.server.to(roomName).emit('lobby_updated', { roomName, isLocked: locked });
  }

  /** Yonetici odayi kapatir: herkes cikarilir (oda kaydini silmek cagiranin isidir). */
  async evictRoom(roomName: string, message: string) {
    this.server.to(roomName).emit('lobby_closed', { roomName, message });
    for (const [socketId, roomUser] of this.socketsInRoom(roomName)) {
      const roomSocket = this.server.sockets.sockets.get(socketId);
      if (roomSocket) await this.leaveLobby(roomSocket, roomUser);
    }
  }

  // ── WEB: P2P WEBRTC SINYALLESMESI (kamera + ekran paylasimi) ──
  private leaveCall(userId: number, socketId?: string) {
    const roomName = socketId
      ? this.rtcService.leaveBySocket(userId, socketId)
      : this.rtcService.leave(userId);
    if (roomName) {
      this.server.to(roomName).emit('rtc_peer_left', { userId });
      this.broadcastRoomUsers(roomName);
    }
  }

  @SubscribeMessage('rtc_join')
  async handleRtcJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RtcJoinDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const data = this.parsePayload(payload);
    const roomUser = this.connectedUsers.get(client.id);
    if (!roomUser || roomUser.roomName !== data.roomName) {
      client.emit('rtc_error', { message: 'Önce odaya katılmalısın.' });
      return;
    }

    try {
      const lobby = await this.lobbiesService.findByName(data.roomName);
      const { peers, previousRoom, previousSocketId } = this.rtcService.join(
        data.roomName,
        socketUser.sub,
        client.id,
        lobby?.allowVideo ?? false,
      );

      if (previousRoom) {
        this.server
          .to(previousRoom)
          .emit('rtc_peer_left', { userId: socketUser.sub });
      }

      // Ayni kisi yeni bir soketle katildi (yenileme, ikinci sekme): eski sokete bagli
      // eslerin ayni kisiyi iki kez tutmamasi icin once eski baglanti kapatilir.
      if (previousSocketId) {
        client
          .to(data.roomName)
          .except(previousSocketId)
          .emit('rtc_peer_left', { userId: socketUser.sub });
      }

      client.emit('rtc_peers', {
        peers: peers.map((peer) => ({ userId: peer.userId, media: peer.media })),
      });
      client
        .to(data.roomName)
        .emit('rtc_peer_joined', { userId: socketUser.sub });
      this.broadcastRoomUsers(data.roomName);
    } catch (error) {
      client.emit('rtc_error', { message: this.errorMessage(error, 'socket') });
    }
  }

  @SubscribeMessage('rtc_signal')
  handleRtcSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RtcSignalDto | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const data = this.parsePayload(payload);
    const targetSocketId = this.rtcService.resolveSignalTarget(
      socketUser.sub,
      Number(data.targetUserId),
    );
    if (!targetSocketId) return;

    this.server.to(targetSocketId).emit('rtc_signal', {
      fromUserId: socketUser.sub,
      data: data.data,
    });
  }

  @SubscribeMessage('rtc_media_state')
  handleRtcMediaState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Partial<MediaState> | string,
  ) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;

    const media = this.rtcService.updateMedia(
      socketUser.sub,
      this.parsePayload(payload),
    );
    const roomName = this.rtcService.getRoomOf(socketUser.sub);
    if (media && roomName) {
      this.server
        .to(roomName)
        .emit('rtc_media_changed', { userId: socketUser.sub, media });
      this.broadcastRoomUsers(roomName);
    }
  }

  @SubscribeMessage('rtc_leave')
  handleRtcLeave(@ConnectedSocket() client: Socket) {
    const socketUser = this.getSocketUser(client);
    if (!socketUser) return;
    this.leaveCall(socketUser.sub, client.id);
  }

  // ── WEB: ORTAK PDF TAHTASI (cizim + sayfa senkronu) ──
  private getBoardRoom(client: Socket): ConnectedRoomUser | null {
    return this.connectedUsers.get(client.id) ?? null;
  }

  @SubscribeMessage('board_sync')
  handleBoardSync(@ConnectedSocket() client: Socket) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    client.emit('board_state', {
      board: this.whiteboardService.getState(user.roomName),
    });
  }

  @SubscribeMessage('board_open')
  handleBoardOpen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BoardOpenDto | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const data = this.parsePayload(payload);
    try {
      const board =
        data?.blank === true
          ? this.whiteboardService.openBlank(
              user.roomName,
              user.userId,
              user.fullName,
            )
          : this.whiteboardService.open(
              user.roomName,
              user.userId,
              user.fullName,
              data?.fileUrl,
              data?.fileName,
            );
      this.server.to(user.roomName).emit('board_state', { board });
    } catch (error) {
      client.emit('board_error', { message: this.errorMessage(error, 'socket') });
    }
  }

  /** Ortak sayaci/tahtayi yalnizca baslatan kisi ya da oda sahibi kapatabilir. */
  private async canControlShared(user: ConnectedRoomUser, starterId: number) {
    if (user.userId === starterId) return true;
    try {
      await this.lobbiesService.findOwnedLobby({ name: user.roomName }, user.userId);
      return true;
    } catch {
      return false;
    }
  }

  @SubscribeMessage('board_close')
  async handleBoardClose(@ConnectedSocket() client: Socket) {
    const user = this.getBoardRoom(client);
    const board = user && this.whiteboardService.getState(user.roomName);
    if (!user || !board) return;
    if (!(await this.canControlShared(user, board.openedBy))) {
      client.emit('board_error', { message: CONTROL_DENIED });
      return;
    }
    if (this.whiteboardService.close(user.roomName)) {
      this.server.to(user.roomName).emit('board_state', { board: null });
    }
  }

  @SubscribeMessage('board_page')
  handleBoardPage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { page: number } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const result = this.whiteboardService.setPage(
      user.roomName,
      this.parsePayload(payload)?.page,
    );
    if (result) {
      this.server.to(user.roomName).emit('board_page', result);
    }
  }

  /** Cizilmekte olan cizgi: saklanmaz, yalnizca odadaki digerlerine iletilir. */
  @SubscribeMessage('board_live')
  handleBoardLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { stroke: unknown } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user || !this.whiteboardService.getState(user.roomName)) return;
    const stroke = this.whiteboardService.sanitizeLive(
      user.userId,
      this.parsePayload(payload)?.stroke,
    );
    if (stroke) {
      client.volatile.to(user.roomName).emit('board_live', { stroke });
    }
  }

  @SubscribeMessage('board_stroke')
  handleBoardStroke(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { stroke: unknown } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const stroke = this.whiteboardService.addStroke(
      user.roomName,
      user.userId,
      this.parsePayload(payload)?.stroke,
    );
    if (stroke) {
      this.server.to(user.roomName).emit('board_stroke', { stroke });
    }
  }

  @SubscribeMessage('board_erase')
  handleBoardErase(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ids: unknown } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const ids = this.whiteboardService.removeStrokes(
      user.roomName,
      this.parsePayload(payload)?.ids,
    );
    if (ids.length) {
      this.server.to(user.roomName).emit('board_erased', { ids });
    }
  }

  @SubscribeMessage('board_clear')
  handleBoardClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { page: number } | string,
  ) {
    const user = this.getBoardRoom(client);
    if (!user) return;
    const page = this.whiteboardService.clearPage(
      user.roomName,
      this.parsePayload(payload)?.page,
    );
    if (page !== null) {
      this.server.to(user.roomName).emit('board_cleared', { page });
    }
  }

  // ── WEB: ORTAK POMODORO SAYACI ──
  private broadcastRoomTimer(
    roomName: string,
    action: string,
    byName: string | null,
  ) {
    this.server.to(roomName).emit('room_timer', {
      timer: this.roomTimerService.snapshot(roomName),
      action,
      byName,
    });
  }

  @SubscribeMessage('room_timer_sync')
  handleRoomTimerSync(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    client.emit('room_timer', {
      timer: this.roomTimerService.snapshot(user.roomName),
      action: 'sync',
      byName: null,
    });
  }

  @SubscribeMessage('room_timer_start')
  handleRoomTimerStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomTimerStartDto | string,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    const data = this.parsePayload(payload);
    try {
      this.roomTimerService.start(
        user.roomName,
        user.userId,
        user.fullName,
        data?.focusMinutes,
        data?.breakMinutes,
      );
      this.broadcastRoomTimer(user.roomName, 'start', user.fullName);
    } catch (error) {
      client.emit('room_timer_error', { message: this.errorMessage(error, 'socket') });
    }
  }

  @SubscribeMessage('room_timer_pause')
  handleRoomTimerPause(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user && this.roomTimerService.pause(user.roomName)) {
      this.broadcastRoomTimer(user.roomName, 'pause', user.fullName);
    }
  }

  @SubscribeMessage('room_timer_resume')
  handleRoomTimerResume(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user && this.roomTimerService.resume(user.roomName)) {
      this.broadcastRoomTimer(user.roomName, 'resume', user.fullName);
    }
  }

  @SubscribeMessage('room_timer_stop')
  async handleRoomTimerStop(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    const state = user && this.roomTimerService.getState(user.roomName);
    if (!user || !state) return;
    if (!(await this.canControlShared(user, state.startedBy))) {
      client.emit('room_timer_error', { message: CONTROL_DENIED });
      return;
    }
    if (this.roomTimerService.stop(user.roomName)) {
      this.broadcastRoomTimer(user.roomName, 'stop', user.fullName);
    }
  }
}
