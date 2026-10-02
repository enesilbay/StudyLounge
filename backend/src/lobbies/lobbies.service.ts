import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { Lobby } from './lobby.entity';
import * as bcrypt from 'bcrypt';

// P2P mesh WebRTC'de her katilimci digerlerine ayri baglanti actigi icin
// video odalari kucuk tutulur.
export const MAX_VIDEO_ROOM_USERS = 6;

@Injectable()
export class LobbiesService {
  constructor(
    @InjectRepository(Lobby)
    private lobbiesRepository: Repository<Lobby>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(): Promise<(Lobby & { memberCount: number })[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.lobbiesRepository.delete({ createdAt: LessThan(yesterday) });
    const lobbies = await this.lobbiesRepository.find({ order: { id: 'DESC' } });
    const memberCounts = await this.usersService.getRoomMemberCounts(lobbies.map((lobby) => lobby.name));

    return lobbies.map((lobby) => ({
      ...lobby,
      memberCount: memberCounts.get(lobby.name) ?? 0,
    }));
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

    return { success: true };
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

    return lobby;
  }

  async updateActiveUsers(lobbyName: string, activeUsers: number): Promise<void> {
    await this.lobbiesRepository.update({ name: lobbyName }, { activeUsers });
  }
}
