import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Gunluk gruplama, donem sinirlari ve saat dilimi Turkiye saatine gore. */
const TZ = 'Europe/Istanbul';
export const OVERVIEW_PERIODS = [7, 30, 90] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];
/** Elde tutma, donemden bagimsiz olarak son 90 gunde kayit olanlarla olculur. */
export const RETENTION_COHORT_DAYS = 90;
export const RETENTION_DAYS = [1, 7, 30] as const;

/** Secili donem ve hemen onceki ayni uzunluktaki donem. */
export interface Comparison {
  current: number;
  previous: number;
}

export interface DailyPoint {
  /** YYYY-MM-DD (Turkiye saati) */
  date: string;
  newUsers: number;
  /** O gun en az bir odak oturumu bitiren kullanici sayisi. */
  focusUsers: number;
  focusMinutes: number;
}

export interface AdminOverview {
  period: OverviewPeriod;
  /** Donemin ilk gunu (Turkiye saati, YYYY-MM-DD); donem bugunle biter. */
  from: string;
  generatedAt: string;
  pending: {
    openReports: number;
    openFeedback: number;
    /** Satin alinan Premium'u 7 gun icinde bitecek kullanicilar. */
    premiumExpiringSoon: number;
  };
  totals: { users: number; premiumUsers: number };
  newUsers: Comparison;
  focusUsers: Comparison;
  focusMinutes: Comparison;
  /** Son gorulme (lastSeenAt) ile; gecmisi tutulmadigi icin onceki donemle karsilastirilmaz. */
  activeUsers: { period: number; today: number };
  live: { rooms: number; people: number };
  daily: DailyPoint[];
  /** Donemde kayit olanlarin "Masani hazirla" adimlarina ulasma sayilari. */
  funnel: {
    registered: number;
    addedSubject: number;
    setGoal: number;
    firstFocus: number;
  };
  retention: { day: number; eligible: number; retained: number }[];
  /** Haftanin gunu (1 = Pazartesi) x saat (0-23); oturum baslangicina gore odak dakikasi. Bos hucreler yok. */
  heatmap: { dow: number; hour: number; minutes: number }[];
}

type Row = Record<string, string | number | Date | null>;

const num = (value: Row[string] | undefined) => Number(value ?? 0);

@Injectable()
export class AdminOverviewService {
  constructor(private readonly dataSource: DataSource) {}

  /** Yonetim menusundeki rozetler ve genel bakistaki "Bekleyenler" seridi. */
  async getPending(): Promise<AdminOverview['pending']> {
    const [row] = await this.dataSource.query<Row[]>(
      `SELECT
         (SELECT COUNT(*) FROM "reports" WHERE "status" = 'open') AS "openReports",
         (SELECT COUNT(*) FROM "feedback" WHERE "status" = 'open') AS "openFeedback",
         (SELECT COUNT(*) FROM "users"
           WHERE "premiumUntil" > now() AND "premiumUntil" <= now() + interval '7 days') AS "premiumExpiringSoon"`,
    );
    return {
      openReports: num(row?.openReports),
      openFeedback: num(row?.openFeedback),
      premiumExpiringSoon: num(row?.premiumExpiringSoon),
    };
  }

  async getOverview(period: OverviewPeriod): Promise<AdminOverview> {
    const q = <T extends Row>(sql: string, params: unknown[] = []) =>
      this.dataSource.query<T[]>(sql, params);

    // Donem takvim gunleriyle: bugun dahil son N gun (Turkiye gece yarisindan).
    // Onceki donem, hemen ondan onceki N gun. Kartlar ve grafik ayni siniri kullanir.
    const [bounds] = await q(
      `SELECT d."from"::text AS "from",
              (d."from"::timestamp AT TIME ZONE $2) AS "start",
              ((d."from" - $1::int)::timestamp AT TIME ZONE $2) AS "prevStart"
       FROM (SELECT (now() AT TIME ZONE $2)::date - ($1::int - 1) AS "from") d`,
      [period, TZ],
    );
    const { start, prevStart } = bounds;

    const [users, sessions, live, pending, daily, funnel, retention, heatmap] =
      await Promise.all([
        q(
          `SELECT
             COUNT(*) AS "total",
             COUNT(*) FILTER (WHERE "isPremium") AS "premium",
             COUNT(*) FILTER (WHERE "createdAt" >= $1) AS "newCurrent",
             COUNT(*) FILTER (WHERE "createdAt" >= $2 AND "createdAt" < $1) AS "newPrevious",
             COUNT(*) FILTER (WHERE "lastSeenAt" >= $1) AS "activePeriod",
             COUNT(*) FILTER (WHERE ("lastSeenAt" AT TIME ZONE $3)::date = (now() AT TIME ZONE $3)::date) AS "activeToday"
           FROM "users"`,
          [start, prevStart, TZ],
        ),
        q(
          `SELECT
             COUNT(DISTINCT "userId") FILTER (WHERE "endedAt" >= $1) AS "usersCurrent",
             COUNT(DISTINCT "userId") FILTER (WHERE "endedAt" < $1) AS "usersPrevious",
             COALESCE(SUM("minutes") FILTER (WHERE "endedAt" >= $1), 0) AS "minutesCurrent",
             COALESCE(SUM("minutes") FILTER (WHERE "endedAt" < $1), 0) AS "minutesPrevious"
           FROM "study_sessions"
           WHERE "endedAt" >= $2`,
          [start, prevStart],
        ),
        // Oda listesiyle ayni kaynak: cevrimici ve bir odada gorunen kullanicilar.
        q(
          `SELECT COUNT(DISTINCT "currentRoom") AS "rooms", COUNT(*) AS "people"
           FROM "users" WHERE "isOnline" = true AND "currentRoom" IS NOT NULL`,
        ),
        this.getPending(),
        q(
          `WITH days AS (
             SELECT generate_series(($1::timestamptz AT TIME ZONE $2)::date, (now() AT TIME ZONE $2)::date, interval '1 day')::date AS "day"
           ),
           signups AS (
             SELECT ("createdAt" AT TIME ZONE $2)::date AS "day", COUNT(*) AS "count"
             FROM "users" WHERE "createdAt" >= $1 GROUP BY 1
           ),
           focus AS (
             SELECT ("endedAt" AT TIME ZONE $2)::date AS "day", COUNT(DISTINCT "userId") AS "users", SUM("minutes") AS "minutes"
             FROM "study_sessions" WHERE "endedAt" >= $1 GROUP BY 1
           )
           SELECT to_char(days."day", 'YYYY-MM-DD') AS "date",
                  COALESCE(signups."count", 0) AS "newUsers",
                  COALESCE(focus."users", 0) AS "focusUsers",
                  COALESCE(focus."minutes", 0) AS "focusMinutes"
           FROM days
           LEFT JOIN signups ON signups."day" = days."day"
           LEFT JOIN focus ON focus."day" = days."day"
           ORDER BY days."day"`,
          [start, TZ],
        ),
        q(
          `SELECT
             COUNT(*) AS "registered",
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "subjects" s WHERE s."userId" = u."id")) AS "addedSubject",
             COUNT(*) FILTER (WHERE u."dailyGoalMinutes" > 0 OR u."weeklyGoalMinutes" > 0) AS "setGoal",
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "study_sessions" ss WHERE ss."userId" = u."id")) AS "firstFocus"
           FROM "users" u
           WHERE u."createdAt" >= $1`,
          [start],
        ),
        // Kayittan en az N gun sonra bir odak oturumu bitirdi mi (kayan elde tutma).
        q(
          `SELECT n."day",
             COUNT(u."id") AS "eligible",
             COUNT(u."id") FILTER (WHERE EXISTS (
               SELECT 1 FROM "study_sessions" ss
               WHERE ss."userId" = u."id" AND ss."endedAt" >= u."createdAt" + make_interval(days => n."day")
             )) AS "retained"
           FROM unnest($2::int[]) AS n("day")
           LEFT JOIN "users" u
             ON u."createdAt" >= now() - make_interval(days => $1::int)
            AND u."createdAt" <= now() - make_interval(days => n."day")
           GROUP BY n."day"
           ORDER BY n."day"`,
          [RETENTION_COHORT_DAYS, [...RETENTION_DAYS]],
        ),
        q(
          `SELECT EXTRACT(ISODOW FROM "startedAt" AT TIME ZONE $2)::int AS "dow",
                  EXTRACT(HOUR FROM "startedAt" AT TIME ZONE $2)::int AS "hour",
                  SUM("minutes") AS "minutes"
           FROM "study_sessions"
           WHERE "endedAt" >= $1
           GROUP BY 1, 2
           HAVING SUM("minutes") > 0`,
          [start, TZ],
        ),
      ]);

    const u = users[0] ?? {};
    const s = sessions[0] ?? {};
    const f = funnel[0] ?? {};

    return {
      period,
      from: String(bounds.from),
      generatedAt: new Date().toISOString(),
      pending,
      totals: { users: num(u.total), premiumUsers: num(u.premium) },
      newUsers: { current: num(u.newCurrent), previous: num(u.newPrevious) },
      focusUsers: {
        current: num(s.usersCurrent),
        previous: num(s.usersPrevious),
      },
      focusMinutes: {
        current: num(s.minutesCurrent),
        previous: num(s.minutesPrevious),
      },
      activeUsers: { period: num(u.activePeriod), today: num(u.activeToday) },
      live: { rooms: num(live[0]?.rooms), people: num(live[0]?.people) },
      daily: daily.map((row) => ({
        date: String(row.date),
        newUsers: num(row.newUsers),
        focusUsers: num(row.focusUsers),
        focusMinutes: num(row.focusMinutes),
      })),
      funnel: {
        registered: num(f.registered),
        addedSubject: num(f.addedSubject),
        setGoal: num(f.setGoal),
        firstFocus: num(f.firstFocus),
      },
      retention: retention.map((row) => ({
        day: num(row.day),
        eligible: num(row.eligible),
        retained: num(row.retained),
      })),
      heatmap: heatmap.map((row) => ({
        dow: num(row.dow),
        hour: num(row.hour),
        minutes: num(row.minutes),
      })),
    };
  }
}
