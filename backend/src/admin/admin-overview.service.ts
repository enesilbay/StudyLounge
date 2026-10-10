import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../feedback/feedback.entity';
import { Lobby } from '../lobbies/lobby.entity';
import { Report } from '../moderation/report.entity';
import { StudySession } from '../study/study-session.entity';
import { User } from '../users/user.entity';

/** Gunluk gruplama ve "bugun" hesabi Turkiye saatine gore yapilir. */
const TZ = 'Europe/Istanbul';
export const OVERVIEW_DAYS = 30;

export interface DailyPoint {
  /** YYYY-MM-DD (Turkiye saati) */
  date: string;
  newUsers: number;
  /** O gun en az bir odak oturumu bitiren kullanici sayisi. */
  focusUsers: number;
  focusMinutes: number;
}

export interface AdminOverview {
  users: { total: number; today: number; week: number; month: number };
  /** Odak oturumu kaydi olan benzersiz kullanici (bugun / son 7 gun). */
  activeUsers: { today: number; week: number };
  focusMinutes: { total: number; today: number; week: number };
  rooms: { open: number; people: number };
  openReports: number;
  openFeedback: number;
  daily: DailyPoint[];
}

interface DayRow {
  day: string;
  count?: string;
  users?: string;
  minutes?: string;
}

@Injectable()
export class AdminOverviewService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(StudySession)
    private readonly sessions: Repository<StudySession>,
    @InjectRepository(Lobby) private readonly lobbies: Repository<Lobby>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Feedback) private readonly feedback: Repository<Feedback>,
  ) {}

  async getOverview(): Promise<AdminOverview> {
    const [
      userCounts,
      sessionCounts,
      roomCounts,
      openReports,
      openFeedback,
      newUserDays,
      sessionDays,
    ] = await Promise.all([
      this.users
        .createQueryBuilder('u')
        .select('COUNT(*)', 'total')
        .addSelect(
          `COUNT(*) FILTER (WHERE (u."createdAt" AT TIME ZONE :tz)::date = (now() AT TIME ZONE :tz)::date)`,
          'today',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE u."createdAt" >= now() - interval '7 days')`,
          'week',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE u."createdAt" >= now() - interval '30 days')`,
          'month',
        )
        .setParameter('tz', TZ)
        .getRawOne<Record<string, string>>(),
      this.sessions
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.minutes), 0)', 'totalMinutes')
        .addSelect(
          `COALESCE(SUM(s.minutes) FILTER (WHERE (s."endedAt" AT TIME ZONE :tz)::date = (now() AT TIME ZONE :tz)::date), 0)`,
          'todayMinutes',
        )
        .addSelect(
          `COALESCE(SUM(s.minutes) FILTER (WHERE s."endedAt" >= now() - interval '7 days'), 0)`,
          'weekMinutes',
        )
        .addSelect(
          `COUNT(DISTINCT s."userId") FILTER (WHERE (s."endedAt" AT TIME ZONE :tz)::date = (now() AT TIME ZONE :tz)::date)`,
          'todayUsers',
        )
        .addSelect(
          `COUNT(DISTINCT s."userId") FILTER (WHERE s."endedAt" >= now() - interval '7 days')`,
          'weekUsers',
        )
        .setParameter('tz', TZ)
        .getRawOne<Record<string, string>>(),
      this.lobbies
        .createQueryBuilder('l')
        .select('COUNT(*) FILTER (WHERE l."activeUsers" > 0)', 'open')
        .addSelect('COALESCE(SUM(l."activeUsers"), 0)', 'people')
        .getRawOne<Record<string, string>>(),
      this.reports.count({ where: { status: 'open' } }),
      this.feedback.count({ where: { status: 'open' } }),
      this.users
        .createQueryBuilder('u')
        .select(
          `to_char((u."createdAt" AT TIME ZONE :tz)::date, 'YYYY-MM-DD')`,
          'day',
        )
        .addSelect('COUNT(*)', 'count')
        .where(
          `(u."createdAt" AT TIME ZONE :tz)::date >= (now() AT TIME ZONE :tz)::date - :span::int`,
          { tz: TZ, span: OVERVIEW_DAYS - 1 },
        )
        .groupBy('day')
        .getRawMany<DayRow>(),
      this.sessions
        .createQueryBuilder('s')
        .select(
          `to_char((s."endedAt" AT TIME ZONE :tz)::date, 'YYYY-MM-DD')`,
          'day',
        )
        .addSelect('COUNT(DISTINCT s."userId")', 'users')
        .addSelect('COALESCE(SUM(s.minutes), 0)', 'minutes')
        .where(
          `(s."endedAt" AT TIME ZONE :tz)::date >= (now() AT TIME ZONE :tz)::date - :span::int`,
          { tz: TZ, span: OVERVIEW_DAYS - 1 },
        )
        .groupBy('day')
        .getRawMany<DayRow>(),
    ]);

    const newByDay = new Map(
      newUserDays.map((row) => [row.day, Number(row.count)]),
    );
    const sessionByDay = new Map(
      sessionDays.map((row) => [
        row.day,
        { users: Number(row.users), minutes: Number(row.minutes) },
      ]),
    );

    return {
      users: {
        total: Number(userCounts?.total ?? 0),
        today: Number(userCounts?.today ?? 0),
        week: Number(userCounts?.week ?? 0),
        month: Number(userCounts?.month ?? 0),
      },
      activeUsers: {
        today: Number(sessionCounts?.todayUsers ?? 0),
        week: Number(sessionCounts?.weekUsers ?? 0),
      },
      focusMinutes: {
        total: Number(sessionCounts?.totalMinutes ?? 0),
        today: Number(sessionCounts?.todayMinutes ?? 0),
        week: Number(sessionCounts?.weekMinutes ?? 0),
      },
      rooms: {
        open: Number(roomCounts?.open ?? 0),
        people: Number(roomCounts?.people ?? 0),
      },
      openReports,
      openFeedback,
      daily: buildDays(OVERVIEW_DAYS).map((date) => ({
        date,
        newUsers: newByDay.get(date) ?? 0,
        focusUsers: sessionByDay.get(date)?.users ?? 0,
        focusMinutes: sessionByDay.get(date)?.minutes ?? 0,
      })),
    };
  }
}

/** Bugunden geriye `count` gunun YYYY-MM-DD listesi (Turkiye saati, eskiden yeniye). */
export function buildDays(count: number, now = new Date()): string[] {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(
      formatter.format(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)),
    );
  }
  return days;
}
