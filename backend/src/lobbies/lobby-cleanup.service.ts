import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LobbiesService } from './lobbies.service';

/** Saatlik zamanlayıcı: 24 saati geçmiş, içinde kimse olmayan odaları temizler. */
@Injectable()
export class LobbyCleanupService {
  constructor(private readonly lobbiesService: LobbiesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    await this.lobbiesService.cleanupExpiredLobbies();
  }
}
