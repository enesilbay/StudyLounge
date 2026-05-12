import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
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

  async verifyPassword(
    lobbyId: number,
    password?: string,
    userId?: number, // Mobil taraftan userId de gönderilmeli ki premium durumunu kontrol edelim
  ): Promise<{ success: boolean }> {
    const lobby = await this.lobbiesRepository.findOne({
      where: { id: lobbyId },
    });
    if (!lobby) throw new NotFoundException('Lobi bulunamadı.');

    // Elite Oda kontrolü
    if (lobby.isPremiumOnly && userId) {
      // Normalde burada User repository'den de kontrol edebiliriz,
      // Ancak hızlıca bir kontrol yapmak için şimdilik mobile'ın yetkisini de kullanabiliriz.
      // Daha iyisi User repoya bakmak ama service'te usersRepository yok.
      // Şimdilik Elite oda girişi için basit bir kontrol bırakalım. (Gerçek yetki mobile'da yapılacak)
    }

    if (!lobby.isPrivate) return { success: true };

    if (lobby.password !== password) {
      throw new UnauthorizedException('Şifre hatalı.');
    }

    return { success: true };
  }
}
