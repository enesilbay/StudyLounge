import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { APP_TIME_ZONE, addDaysToKey, localWeekStartKey } from '../config/time';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { BADGE_NAMES } from '../users/badges';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { WeeklyResult } from './weekly-result.entity';

/** Haftanın ilk üçüne verilen Odak Puanı. */
export const WEEKLY_REWARDS = [100, 60, 30];
const LEADERBOARD_SIZE = 20;

export interface WeeklyEntry {
  rank: number;
  minutes: number;
  user: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame' | 'isPremium'>;
}

@Injectable()
export class LeagueService {
  private readonly logger = new Logger(LeagueService.name);

  constructor(
    @InjectRepository(DailyAnalytics)
    private readonly dailyAnalytics: Repository<DailyAnalytics>,
    @InjectRepository(WeeklyResult)
    private readonly results: Repository<WeeklyResult>,
    private readonly usersService: UsersService,
  ) {}

  /** Haftanın dakika toplamları, çoktan aza. `userIds` verilirse yalnız o kişiler. */
  private async weekTotals(weekStart: string, userIds?: number[], limit = LEADERBOARD_SIZE) {
    if (userIds && userIds.length === 0) return [];
    const query = this.dailyAnalytics
      .createQueryBuilder('day')
      .innerJoin('day.user', 'user')
      .select('user.id', 'id')
      .addSelect('user.username', 'username')
      .addSelect('user.fullName', 'fullName')
      .addSelect('user.avatarUrl', 'avatarUrl')
      .addSelect('user.equippedProfileFrame', 'equippedProfileFrame')
      .addSelect('user.isPremium', 'isPremium')
      .addSelect('SUM(day.focusMinutes)', 'minutes')
      .where('day.date BETWEEN :start AND :end', { start: weekStart, end: addDaysToKey(weekStart, 6) })
      .andWhere('user.bannedAt IS NULL')
      .groupBy('user.id')
      .having('SUM(day.focusMinutes) > 0')
      .orderBy('minutes', 'DESC')
      .addOrderBy('user.id', 'ASC');
    if (userIds) query.andWhere('user.id IN (:...userIds)', { userIds });
    const rows = await query.limit(limit).getRawMany<WeeklyEntry['user'] & { minutes: string }>();
    return rows.map((row, index): WeeklyEntry => ({
      rank: index + 1,
      minutes: Number(row.minutes),
      user: {
        id: row.id,
        username: row.username,
        fullName: row.fullName,
        avatarUrl: row.avatarUrl,
        equippedProfileFrame: row.equippedProfileFrame,
        isPremium: row.isPremium,
      },
    }));
  }

  /** Bu haftanın sıralaması ve benim yerim. Arkadaş kapsamında ben de listedeyim. */
  async weekly(userId: number, scope: 'global' | 'friends') {
    const weekStart = localWeekStartKey(new Date());
    let entries: WeeklyEntry[];
    if (scope === 'friends') {
      const friendIds = (await this.usersService.getFriends(userId)).map((friend) => friend.id);
      entries = await this.weekTotals(weekStart, [...friendIds, userId], 200);
    } else {
      entries = await this.weekTotals(weekStart);
    }

    let me = entries.find((entry) => entry.user.id === userId) ?? null;
    if (!me && scope === 'global') {
      // İlk 20'de değilsem gerçek sıram ayrıca hesaplanır.
      const all = await this.weekTotals(weekStart, undefined, 100000);
      me = all.find((entry) => entry.user.id === userId) ?? null;
    }

    return {
      weekStart,
      weekEnd: addDaysToKey(weekStart, 6),
      rewards: WEEKLY_REWARDS,
      entries,
      me: me ? { rank: me.rank, minutes: me.minutes } : null,
    };
  }

  /** Geçmiş haftaların ilk üçü (en yeni hafta önce). */
  async champions(weeks = 6) {
    const rows = await this.results.find({
      relations: { user: true },
      select: {
        id: true,
        weekStart: true,
        rank: true,
        minutes: true,
        reward: true,
        user: { id: true, username: true, fullName: true, avatarUrl: true, equippedProfileFrame: true },
      },
      order: { weekStart: 'DESC', rank: 'ASC' },
      take: weeks * WEEKLY_REWARDS.length,
    });
    const byWeek = new Map<string, typeof rows>();
    for (const row of rows) byWeek.set(row.weekStart, [...(byWeek.get(row.weekStart) ?? []), row]);
    return [...byWeek.entries()].map(([weekStart, podium]) => ({ weekStart, podium }));
  }

  /**
   * Her pazartesi 00:05 (Türkiye saati): biten haftanın ilk üçüne puan verir ve kaydeder.
   * Aynı hafta için tekrar çalışırsa (ör. sunucu yeniden başladı) ikinci kez ödül verilmez.
   */
  @Cron('5 0 * * 1', { timeZone: APP_TIME_ZONE })
  async closeLastWeek() {
    const lastWeek = addDaysToKey(localWeekStartKey(new Date()), -7);
    return this.closeWeek(lastWeek);
  }

  async closeWeek(weekStart: string) {
    if (await this.results.exists({ where: { weekStart } })) return [];
    const podium = await this.weekTotals(weekStart, undefined, WEEKLY_REWARDS.length);
    const saved: WeeklyResult[] = [];
    for (const entry of podium) {
      const reward = WEEKLY_REWARDS[entry.rank - 1];
      const inserted = await this.results
        .createQueryBuilder()
        .insert()
        .values({ weekStart, user: { id: entry.user.id }, rank: entry.rank, minutes: entry.minutes, reward })
        .orIgnore()
        .execute();
      // Çakışmada (aynı hafta zaten yazılmış) Postgres satır döndürmez; ödül tekrar verilmez.
      if (!(inserted.raw as unknown[] | undefined)?.length) continue;
      await this.usersService.addCoins(entry.user.id, reward);
      if (entry.rank === 1) await this.usersService.awardBadge(entry.user.id, BADGE_NAMES.weeklyChampion);
      saved.push({ weekStart, rank: entry.rank, minutes: entry.minutes, reward } as WeeklyResult);
    }
    this.logger.log(`Hafta ${weekStart} kapatildi: ${saved.length} kisi odullendirildi.`);
    return saved;
  }
}
