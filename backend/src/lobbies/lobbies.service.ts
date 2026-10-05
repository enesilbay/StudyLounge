import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
/** Odadan çıkarılan kişi bu süre boyunca aynı odaya giremez. */
export const KICK_BAN_MS = 15 * 60 * 1000;

@Injectable()
export class LobbiesService {
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

  async findAll(): Promise<(Lobby & { memberCount: number; ownerId: number | null; isLocked: boolean })[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.lobbiesRepository.delete({ createdAt: LessThan(yesterday) });
    // Sahibin yalnızca id'si yüklenir; e-posta gibi alanlar istemciye gitmez.
    const lobbies = await this.lobbiesRepository
      .createQueryBuilder('lobby')
      .leftJoin('lobby.owner', 'owner')
      .addSelect('owner.id')
      .orderBy('lobby.id', 'DESC')
      .getMany();
    const memberCounts = await this.usersService.getRoomMemberCounts(lobbies.map((lobby) => lobby.name));

    return lobbies.map(({ owner, ...lobby }) => ({
      ...lobby,
      ownerId: owner?.id ?? null,
      isLocked: this.locks.has(lobby.id),
      memberCount: memberCounts.get(lobby.name) ?? 0,
    }));
  }

  /** Odayı sahibi adına getirir; sahibi değilse 403. */
  async findOwnedLobby(where: { id: number } | { name: string }, userId: number): Promise<Lobby> {
    const lobby = await this.lobbiesRepository.findOne({ where, relations: { owner: true } });
    if (!lobby) throw new NotFoundException('Lobi bulunamadi.');
    if (lobby.owner?.id !== userId) throw new ForbiddenException('Bu islemi yalnizca oda sahibi yapabilir.');
    return lobby;
  }

  async update(userId: number, id: number, dto: UpdateLobbyDto) {
    const lobby = await this.findOwnedLobby({ id }, userId);
    if (dto.description !== undefined) lobby.description = dto.description;
    if (dto.category !== undefined) lobby.category = dto.category;
    if (dto.maxUsers !== undefined) {
      lobby.maxUsers = lobby.allowVideo ? Math.min(dto.maxUsers, MAX_VIDEO_ROOM_USERS) : dto.maxUsers;
    }
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
        if (!current?.passwordHash) throw new BadRequestException('Sifreli oda icin bir sifre belirle.');
      }
      lobby.isPrivate = true;
    }
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
    if (targetUserId === ownerId) throw new BadRequestException('Kendini odadan cikaramazsin.');
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

  async create(lobbyData: CreateLobbyDto, ownerId: number): Promise<Lobby> {
    const allowVideo = lobbyData.allowVideo ?? false;
    if (allowVideo) {
      const owner = await this.usersService.findById(ownerId);
      if (!owner?.isPremium) {
        throw new ForbiddenException(
          'Kamerali oda olusturmak icin Premium gereklidir.',
        );
      }
    }

    const requestedMaxUsers = lobbyData.maxUsers ?? 50;
    const maxUsers = allowVideo
      ? Math.min(requestedMaxUsers, MAX_VIDEO_ROOM_USERS)
      : requestedMaxUsers;

    const passwordHash =
      lobbyData.isPrivate && lobbyData.password
        ? await bcrypt.hash(lobbyData.password, 10)
        : undefined;

    const newLobby = this.lobbiesRepository.create({
      name: lobbyData.name,
      icon: lobbyData.icon,
      category: lobbyData.category,
      description: lobbyData.description,
      isPrivate: lobbyData.isPrivate ?? false,
      isPremiumOnly: lobbyData.isPremiumOnly ?? false,
      allowVideo,
      maxUsers,
      passwordHash,
      owner: { id: ownerId },
    });

    const saved = await this.lobbiesRepository.save(newLobby);
    // Sifreli odanin bcrypt ozeti yanitla istemciye gitmesin.
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
      throw new NotFoundException('Lobi bulunamadi.');
    }

    if (lobby.isPremiumOnly) {
      const user = await this.usersService.findById(userId);
      if (!user?.isPremium) {
        throw new UnauthorizedException('Bu lobi premium kullanicilara ozel.');
      }
    }

    if (!lobby.isPrivate) {
      return { success: true };
    }

    if (!password || !lobby.passwordHash) {
      throw new UnauthorizedException('Sifre hatali.');
    }

    const isPasswordValid = await bcrypt.compare(password, lobby.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Sifre hatali.');
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
   * Kaydi olmayan oda adlari (eski/silinmis odalar) icin erisim engellenmez.
   */
  async canAccessRoom(lobbyName: string, userId: number): Promise<boolean> {
    const lobby = await this.lobbiesRepository.findOne({
      where: { name: lobbyName },
      relations: { owner: true },
    });
    if (!lobby || !lobby.isPrivate) return true;
    if (lobby.owner?.id === userId) return true;

    return this.lobbyAccessRepository.exists({
      where: { lobby: { id: lobby.id }, user: { id: userId } },
    });
  }

  async assertUserCanEnter(lobbyName: string, userId: number): Promise<Lobby> {
    const lobby = await this.findByName(lobbyName);
    if (!lobby) {
      throw new NotFoundException('Lobi bulunamadi.');
    }

    if (lobby.isPremiumOnly) {
      const user = await this.usersService.findById(userId);
      if (!user?.isPremium) {
        throw new UnauthorizedException('Bu lobi premium kullanicilara ozel.');
      }
    }

    if (lobby.isPrivate && !(await this.canAccessRoom(lobbyName, userId))) {
      throw new UnauthorizedException('Bu oda sifreli. Once sifreyi gir.');
    }

    const kickedUntil = this.kickedUntil(lobby.id, userId);
    if (kickedUntil) {
      const minutes = Math.ceil((kickedUntil - Date.now()) / 60000);
      throw new ForbiddenException(`Bu odadan cikarildin. ${minutes} dakika sonra tekrar deneyebilirsin.`);
    }

    const allowed = this.locks.get(lobby.id);
    if (allowed && !allowed.has(userId)) {
      throw new ForbiddenException('Oda sahibi odayi yeni girislere kilitledi.');
    }

    return lobby;
  }

  async updateActiveUsers(lobbyName: string, activeUsers: number): Promise<void> {
    await this.lobbiesRepository.update({ name: lobbyName }, { activeUsers });
  }
}
