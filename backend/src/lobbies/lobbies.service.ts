import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { Lobby } from './lobby.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LobbiesService {
  constructor(
    @InjectRepository(Lobby)
    private lobbiesRepository: Repository<Lobby>,
    private readonly usersService: UsersService,
  ) {}

  findAll(): Promise<Lobby[]> {
    return this.lobbiesRepository.find({ order: { id: 'DESC' } });
  }

  findByName(name: string): Promise<Lobby | null> {
    return this.lobbiesRepository.findOne({ where: { name } });
  }

  async create(lobbyData: CreateLobbyDto, ownerId: number): Promise<Lobby> {
    const passwordHash =
      lobbyData.isPrivate && lobbyData.password
        ? await bcrypt.hash(lobbyData.password, 10)
        : undefined;

    const newLobby = this.lobbiesRepository.create({
      name: lobbyData.name,
      icon: lobbyData.icon,
      description: lobbyData.description,
      isPrivate: lobbyData.isPrivate ?? false,
      isPremiumOnly: lobbyData.isPremiumOnly ?? false,
      maxUsers: lobbyData.maxUsers ?? 50,
      passwordHash,
      owner: { id: ownerId },
    });

    return this.lobbiesRepository.save(newLobby);
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
}
