import 'reflect-metadata';
import './config/pg-utc';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Lobby } from './lobbies/lobby.entity';
import { LobbyAccess } from './lobbies/lobby-access.entity';
import { Subject } from './study/subject.entity';
import { StudySession } from './study/study-session.entity';
import { Task } from './study/task.entity';
import { ScheduledSession, ScheduledSessionInvite } from './study/scheduled-session.entity';
import { Block } from './moderation/block.entity';
import { Report } from './moderation/report.entity';
import { WeeklyResult } from './league/weekly-result.entity';
import { Feedback } from './feedback/feedback.entity';
import { Message } from './messages/message.entity';
import { DirectMessage } from './messages/direct-message.entity';
import { DailyAnalytics } from './users/daily-analytics.entity';
import { Friendship } from './users/friendship.entity';
import { User } from './users/user.entity';

config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

// Uygulamayla ayni kural: DATABASE_URL varsa o kullanilir (bkz. app.module.ts).
const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
const dbHost = databaseUrl
  ? new URL(databaseUrl).hostname
  : (process.env.DB_HOST ?? 'localhost');
const dbSsl =
  toBoolean(process.env.DB_SSL, false) ||
  Boolean(databaseUrl?.includes('sslmode=require')) ||
  dbHost.includes('neon.tech') ||
  dbHost.includes('render.com') ||
  dbHost.startsWith('dpg-');

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  host: dbHost,
  port: toNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USER ?? 'enes_admin',
  password: process.env.DB_PASSWORD ?? 'studylounge_secret',
  database: process.env.DB_NAME ?? 'studylounge',
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
  entities: [
    User,
    Lobby,
    LobbyAccess,
    Friendship,
    DailyAnalytics,
    Message,
    DirectMessage,
    Subject,
    StudySession,
    Task,
    ScheduledSession,
    ScheduledSessionInvite,
    Block,
    Report,
    WeeklyResult,
    Feedback,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
