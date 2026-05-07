import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lobby } from './lobby.entity';

@Injectable()
export class LobbiesService {
  constructor(
    @InjectRepository(Lobby)
    private lobbiesRepository: Repository<Lobby>,
  ) {}

  // Tüm lobileri getir (Mobil uygulama açıldığında çağrılır)
  findAll(): Promise<Lobby[]> {
    return this.lobbiesRepository.find({ order: { id: 'DESC' } });
  }

  // Yeni bir lobi oluştur (Form gönderildiğinde çağrılır)
  create(lobbyData: Partial<Lobby>): Promise<Lobby> {
    const newLobby = this.lobbiesRepository.create(lobbyData);
    return this.lobbiesRepository.save(newLobby);
  }

  // Şifre doğrulama
  async verifyPassword(lobbyId: number, password?: string): Promise<{ success: boolean }> {
    const lobby = await this.lobbiesRepository.findOne({ where: { id: lobbyId } });
    if (!lobby) throw new NotFoundException('Lobi bulunamadı.');
    
    if (!lobby.isPrivate) return { success: true };
    
    if (lobby.password !== password) {
      throw new UnauthorizedException('Şifre hatalı.');
    }
    
    return { success: true };
  }
}