import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { LeagueService } from './league.service';

@UseGuards(JwtAuthGuard)
@Controller('league')
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  /** Bu haftanın sıralaması (pazartesi 00:00 Türkiye saatinde sıfırlanır). */
  @Get('weekly')
  weekly(@CurrentUser() user: User, @Query('scope') scope?: string) {
    return this.leagueService.weekly(user.id, scope === 'friends' ? 'friends' : 'global');
  }

  @Get('champions')
  champions() {
    return this.leagueService.champions();
  }
}
