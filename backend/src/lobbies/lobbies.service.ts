import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lobby } from './lobby.entity';
import { UsersService } from '../users/users.service';

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

  create(lobbyData: Partial<Lobby>): Promise<Lobby> {
    const newLobby = this.lobbiesRepository.create(lobbyData);
    return this.lobbiesRepository.save(newLobby);
  }

  async verifyPassword(
    lobbyId: number,
    password: string | undefined,
    userId: number,
  ): Promise<{ success: boolean }> {
    const lobby = await this.lobbiesRepository.findOne({
      where: { id: lobbyId },
    });

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

    if (lobby.password !== password) {
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
