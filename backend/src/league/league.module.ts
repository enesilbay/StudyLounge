import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { UsersModule } from '../users/users.module';
import { LeagueController } from './league.controller';
import { LeagueService } from './league.service';
import { WeeklyResult } from './weekly-result.entity';

/** Haftalık lig: sıralama, geçmiş şampiyonlar ve pazartesi ödülleri. */
@Module({
  imports: [TypeOrmModule.forFeature([DailyAnalytics, WeeklyResult]), UsersModule],
  controllers: [LeagueController],
  providers: [LeagueService],
})
export class LeagueModule {}
