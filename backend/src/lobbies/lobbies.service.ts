import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { UpdateLobbyDto } from './dto/update-lobby.dto';
import { Lobby } from './lobby.entity';
import { LobbyAccess } from './lobby-access.entity';
import * as bcrypt from 'bcrypt';

// P2P mesh WebRTC'de her katilimci digerlerine ayri baglanti actigi icin
// video odalari kucuk tutulur.
export const MAX_VIDEO_ROOM_USERS = 6;
/** Şifreli odada en fazla kişi: Premium sahip için 5, değilse 2. */
export const PRIVATE_ROOM_MAX_USERS = 5;
export const PRIVATE_ROOM_MAX_USERS_FREE = 2;
/** Odalar bu süre sonunda (içinde kimse yoksa) temizlenir. */
export const LOBBY_TTL_MS = 24 * 60 * 60 * 1000;

/** Odadan çıkarılan kişi bu süre boyunca aynı odaya giremez. */
export const KICK_BAN_MS = 15 * 60 * 1000;

@Injectable()
export class LobbiesService {
  private readonly logger = new Logger(LobbiesService.name);

  constructor(
    @InjectRepository(Lobby)
    private lobbiesRepository: Repository<Lobby>,
    @InjectRepository(LobbyAccess)
    private lobbyAccessRepository: Repository<LobbyAccess>,
    private readonly usersService: UsersService,
  ) {}

  // Oda sahibi kontrolleri bellekte tutulur; odalar zaten 24 saat yaşar.
  /** `lobbyId:userId` -> çıkarma yasağının bittiği an. */
  private readonly kicks = new Map<string, number>();
  /** Kilitli oda -> kilitlendiği anda odada olanlar (sayfayı yenileyince geri girebilsinler). */
  private readonly locks = new Map<number, Set<number>>();

  async findAll(
    userId?: number,
  ): Promise<(Lobby & { memberCount: number; ownerId: number | null; isLocked: boolean; hasAccess: boolean })[]> {
    // Sahibin yalnızca id'si yüklenir; e-posta gibi alanlar istemciye gitmez.
    const lobbies = await this.lobbiesRepository
      .createQueryBuilder('lobby')
      .leftJoin('lobby.owner', 'owner')
      .addSelect('owner.id')
      .orderBy('lobby.id', 'DESC')
      .getMany();
    const memberCounts = await this.usersService.getRoomMemberCounts(lobbies.map((lobby) => lobby.name));
    const grantedIds = new Set<number>();
    if (userId !== undefined) {
      const grants = await this.lobbyAccessRepository.find({
        where: { user: { id: userId } },
        loadRelationIds: { relations: ['lobby'] },
      });
      for (const grant of grants) grantedIds.add(grant.lobby as unknown as number);
    }

    return lobbies.map(({ owner, ...lobby }) => ({
      ...lobby,
      ownerId: owner?.id ?? null,
      isLocked: this.locks.has(lobby.id),
      memberCount: memberCounts.get(lobby.name) ?? 0,
      hasAccess: userId !== undefined && (owner?.id === userId || grantedIds.has(lobby.id)),
    }));
  }

  /** Temizlik (LobbyCleanupService saatlik çağırır): 24 saati geçmiş ve içinde kimse olmayan odaları siler. */
  async cleanupExpiredLobbies(): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - LOBBY_TTL_MS);
      const expired = await this.lobbiesRepository.find({ where: { createdAt: LessThan(cutoff) } });
      if (expired.length === 0) return 0;
      const memberCounts = await this.usersService.getRoomMemberCounts(expired.map((lobby) => lobby.name));
      const empty = expired.filter((lobby) => !memberCounts.get(lobby.name));
      if (empty.length === 0) return 0;
      for (const lobby of empty) this.locks.delete(lobby.id);
      await this.lobbiesRepository.delete(empty.map((lobby) => lobby.id));
      return empty.length;
    } catch (error) {
      this.logger.error('Eski odalar temizlenemedi.', error instanceof Error ? error.stack : String(error));
      return 0;
    }
  }

  /** Aynı ad (büyük/küçük harf duyarsız, kırpılmış) başka bir odada var mı? */
  private async isNameTaken(name: string): Promise<boolean> {
    const count = await this.lobbiesRepository
      .createQueryBuilder('lobby')
      .where('LOWER(lobby.name) = LOWER(:name)', { name })
      .getCount();
    return count > 0;
  }

  /** Odayı sahibi adına getirir; sahibi değilse 403. */
  async findOwnedLobby(where: { id: number } | { name: string }, userId: number): Promise<Lobby> {
    const lobby = await this.lobbiesRepository.findOne({ where, relations: { owner: true } });
    if (!lobby) throw new NotFoundException('Lobi bulunamadı.');
    if (lobby.owner?.id !== userId) throw new ForbiddenException('Bu işlemi yalnızca oda sahibi yapabilir.');
    return lobby;
  }

  async update(userId: number, id: number, dto: UpdateLobbyDto) {
    const lobby = await this.findOwnedLobby({ id }, userId);
    const requestedMaxUsers = dto.maxUsers ?? lobby.maxUsers;
    if (dto.description !== undefined) lobby.description = dto.description;
    if (dto.category !== undefined) lobby.category = dto.category;
    if (dto.isPrivate === false) {
      lobby.isPrivate = false;
      lobby.passwordHash = undefined;
    } else if (dto.isPrivate === true || dto.password) {
      if (dto.password) {
        lobby.passwordHash = await bcrypt.hash(dto.password, 10);
      } else {
        const current = await this.lobbiesRepository
          .createQueryBuilder('lobby')
          .addSelect('lobby.passwordHash')
          .where('lobby.id = :id', { id })
          .getOne();
        if (!current?.passwordHash) throw new BadRequestException('Şifreli oda için bir şifre belirle.');
      }
      lobby.isPrivate = true;
    }
    // Kapasite kuralları sunucuda uygulanır: kameralı oda ≤ 6, şifreli oda ≤ 5 (Premium) / 2.
    const ownerUser = await this.usersService.findById(userId);
    lobby.maxUsers = this.capMaxUsers(requestedMaxUsers, {
      allowVideo: lobby.allowVideo,
      isPrivate: lobby.isPrivate,
      ownerIsPremium: !!ownerUser?.isPremium,
    });
    // passwordHash undefined iken save kolona dokunmaz; şifre kaldırılırken açıkça null yazılır.
    const { owner, ...saved } = await this.lobbiesRepository.save(lobby);
    if (dto.isPrivate === false) await this.lobbiesRepository.update(id, { passwordHash: null as unknown as string });
    delete saved.passwordHash;
    return { ...saved, ownerId: owner?.id ?? null, isLocked: this.locks.has(id) };
  }

  /** Yeni girişleri kapatır/açar. `memberIds`: o an odada olanlar (kilitliyken de geri girebilirler). */
  async setLocked(lobbyName: string, userId: number, locked: boolean, memberIds: number[]) {
    const lobby = await this.findOwnedLobby({ name: lobbyName }, userId);
    if (locked) this.locks.set(lobby.id, new Set([...memberIds, userId]));
    else this.locks.delete(lobby.id);
    return lobby;
  }

  /** Kişiyi odadan çıkarır: 15 dakika giremez, şifreli odaysa izni de silinir. */
  async kick(lobbyName: string, ownerId: number, targetUserId: number) {
    const lobby = await this.findOwnedLobby({ name: lobbyName }, ownerId);
    if (targetUserId === ownerId) throw new BadRequestException('Kendini odadan çıkaramazsın.');
    this.kicks.set(`${lobby.id}:${targetUserId}`, Date.now() + KICK_BAN_MS);
    this.locks.get(lobby.id)?.delete(targetUserId);
    await this.lobbyAccessRepository.delete({ lobby: { id: lobby.id }, user: { id: targetUserId } });
    return lobby;
  }

  /** Odayı tamamen kapatır (siler). Giriş izinleri ilişkiyle birlikte silinir. */
  async close(lobbyName: string, ownerId: number) {
    const lobby = await this.findOwnedLobby({ name: lobbyName }, ownerId);
    this.locks.delete(lobby.id);
    await this.lobbiesRepository.delete(lobby.id);
    return lobby;
  }

  // ── YÖNETİCİ: sahiplik kontrolü yapılmaz; çağıran uç RolesGuard ile korunur ──

  /** Yönetim listesi: sahibin kullanıcı adı, kişi sayısı ve kilit durumu. */
  async adminList() {
    const lobbies = await this.lobbiesRepository
      .createQueryBuilder('lobby')
      .leftJoin('lobby.owner', 'owner')
      .addSelect(['owner.id', 'owner.username', 'owner.fullName'])
      .orderBy('lobby.id', 'DESC')
      .getMany();
    const memberCounts = await this.usersService.getRoomMemberCounts(lobbies.map((lobby) => lobby.name));
    return lobbies.map(({ owner, ...lobby }) => ({
      ...lobby,
      owner: owner ? { id: owner.id, username: owner.username, fullName: owner.fullName } : null,
      isLocked: this.locks.has(lobby.id),
      memberCount: memberCounts.get(lobby.name) ?? 0,
    }));
  }

  async adminGet(id: number): Promise<Lobby> {
    const lobby = await this.lobbiesRepository.findOne({ where: { id }, relations: { owner: true } });
    if (!lobby) throw new NotFoundException('Oda bulunamadı.');
    return lobby;
  }

  /** `memberIds`: o an odada olanlar (kilitliyken de geri girebilirler). */
  async adminSetLocked(id: number, locked: boolean, memberIds: number[]) {
    const lobby = await this.adminGet(id);
    if (locked) this.locks.set(lobby.id, new Set([...memberIds, ...(lobby.owner ? [lobby.owner.id] : [])]));
    else this.locks.delete(lobby.id);
    return lobby;
  }

  async adminTransferOwner(id: number, newOwnerId: number) {
    const lobby = await this.adminGet(id);
    const newOwner = await this.usersService.findById(newOwnerId);
    if (!newOwner) throw new NotFoundException('Kullanıcı bulunamadı.');
    if (newOwner.bannedAt) throw new BadRequestException('Yasaklı bir kullanıcı oda sahibi yapılamaz.');
    if (lobby.owner?.id === newOwner.id) throw new BadRequestException('Bu kullanıcı zaten odanın sahibi.');
    const previous = lobby.owner ?? null;
    lobby.owner = newOwner;
    await this.lobbiesRepository.save(lobby);
    return { lobby, previous, newOwner };
  }

  async adminClose(id: number) {
    const lobby = await this.adminGet(id);
    this.locks.delete(lobby.id);
    await this.lobbiesRepository.delete(lobby.id);
    return lobby;
  }

  private kickedUntil(lobbyId: number, userId: number): number | null {
    const key = `${lobbyId}:${userId}`;
    const until = this.kicks.get(key);
    if (!until) return null;
    if (until <= Date.now()) {
      this.kicks.delete(key);
      return null;
    }
    return until;
  }

  findByName(name: string): Promise<Lobby | null> {
    return this.lobbiesRepository.findOne({ where: { name } });
  }

  /** Kapasiteyi kameralı ve şifreli oda sınırlarına göre kısar. */
  private capMaxUsers(
    requested: number,
    rules: { allowVideo: boolean; isPrivate: boolean; ownerIsPremium: boolean },
  ): number {
    let max = requested;
    if (rules.isPrivate) {
      max = Math.min(max, rules.ownerIsPremium ? PRIVATE_ROOM_MAX_USERS : PRIVATE_ROOM_MAX_USERS_FREE);
    }
    if (rules.allowVideo) max = Math.min(max, MAX_VIDEO_ROOM_USERS);
    return max;
  }

  async create(lobbyData: CreateLobbyDto, ownerId: number): Promise<Lobby> {
    // Oda kurmak Premium üyelere açık (web: "Oda kurmak için Premium").
    const owner = await this.usersService.findById(ownerId);
    if (!owner?.isPremium) {
      throw new ForbiddenException('Oda kurmak için Premium gereklidir.');
    }

    const name = lobbyData.name.trim();
    if (!name) throw new BadRequestException('Odaya bir ad ver.');
    if (await this.isNameTaken(name)) {
      throw new ConflictException('Bu adla bir oda zaten var.');
    }

    const allowVideo = lobbyData.allowVideo ?? false;
    const isPrivate = lobbyData.isPrivate ?? false;
    const maxUsers = this.capMaxUsers(lobbyData.maxUsers ?? 50, {
      allowVideo,
      isPrivate,
      ownerIsPremium: true,
    });

    const passwordHash =
      isPrivate && lobbyData.password
        ? await bcrypt.hash(lobbyData.password, 10)
        : undefined;

    const newLobby = this.lobbiesRepository.create({
      name,
      icon: lobbyData.icon,
      category: lobbyData.category,
      description: lobbyData.description,
      isPrivate,
      isPremiumOnly: lobbyData.isPremiumOnly ?? false,
      allowVideo,
      maxUsers,
      passwordHash,
      owner: { id: ownerId },
    });

    let saved: Lobby;
    try {
      saved = await this.lobbiesRepository.save(newLobby);
    } catch (error) {
      // Aynı anda aynı adla iki istek: LOWER(name) unique indeksi ikincisini reddeder.
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Bu adla bir oda zaten var.');
      }
      throw error;
    }
    // Şifreli odanın bcrypt özeti yanıtla istemciye gitmesin.
    delete saved.passwordHash;
    return saved;
  }

  async verifyPassword(
    lobbyId: number,
    password: string | undefined,
    userId: number,
  ): Promise<{ success: boolean }> {
    const lobby = await this.lobbiesRepository
      .createQueryBuilder('lobby')
      .addSelect('lobby.passwordHash')
      .where('lobby.id = :lobbyId', { lobbyId })
      .getOne();

    if (!lobby) {
      throw new NotFoundException('Lobi bulunamadı.');
    }

    if (lobby.isPremiumOnly) {
      const user = await this.usersService.findById(userId);
      if (!user?.isPremium) {
        throw new UnauthorizedException('Bu lobi yalnızca Premium kullanıcılara özel.');
      }
    }

    if (!lobby.isPrivate) {
      return { success: true };
    }

    if (!password || !lobby.passwordHash) {
      throw new UnauthorizedException('Şifre hatalı.');
    }

    const isPasswordValid = await bcrypt.compare(password, lobby.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Şifre hatalı.');
    }

    // Sifreyi bilen kullanici odaya (ve sohbet gecmisine) girebilir.
    await this.lobbyAccessRepository
      .createQueryBuilder()
      .insert()
      .values({ lobby: { id: lobby.id }, user: { id: userId } })
      .orIgnore()
      .execute();

    return { success: true };
  }

  /**
   * Sifreli odalara yalnizca oda sahibi ve sifreyi dogru girmis kullanicilar erisir.
   * Kaydi olmayan oda adlari (eski/silinmis odalar) icin erisim yoktur.
   */
  async canAccessRoom(lobbyName: string, userId: number): Promise<boolean> {
    const lobby = await this.lobbiesRepository.findOne({
      where: { name: lobbyName },
      relations: { owner: true },
    });
    if (!lobby) return false;
    if (!lobby.isPrivate) return true;
    if (lobby.owner?.id === userId) return true;

    return this.lobbyAccessRepository.exists({
      where: { lobby: { id: lobby.id }, user: { id: userId } },
    });
  }

  async assertUserCanEnter(lobbyName: string, userId: number): Promise<Lobby> {
    const lobby = await this.findByName(lobbyName);
    if (!lobby) {
      throw new NotFoundException('Lobi bulunamadı.');
    }

    if (lobby.isPremiumOnly) {
      const user = await this.usersService.findById(userId);
      if (!user?.isPremium) {
        throw new UnauthorizedException('Bu lobi yalnızca Premium kullanıcılara özel.');
      }
    }

    if (lobby.isPrivate && !(await this.canAccessRoom(lobbyName, userId))) {
      throw new UnauthorizedException('Bu oda şifreli. Önce şifreyi gir.');
    }

    const kickedUntil = this.kickedUntil(lobby.id, userId);
    if (kickedUntil) {
      const minutes = Math.ceil((kickedUntil - Date.now()) / 60000);
      throw new ForbiddenException(`Bu odadan çıkarıldın. ${minutes} dakika sonra tekrar deneyebilirsin.`);
    }

    const allowed = this.locks.get(lobby.id);
    if (allowed && !allowed.has(userId)) {
      throw new ForbiddenException('Oda sahibi odayı yeni girişlere kilitledi.');
    }

    return lobby;
  }

  async updateActiveUsers(lobbyName: string, activeUsers: number): Promise<void> {
    await this.lobbiesRepository.update({ name: lobbyName }, { activeUsers });
  }
}
