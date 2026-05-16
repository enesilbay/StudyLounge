import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Lobby } from './lobbies/lobby.entity';
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

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USER ?? 'enes_admin',
  password: process.env.DB_PASSWORD ?? 'studylounge_secret',
  database: process.env.DB_NAME ?? 'studylounge',
  ssl: toBoolean(process.env.DB_SSL, false)
    ? { rejectUnauthorized: false }
    : false,
  entities: [User, Lobby, Friendship, DailyAnalytics, Message, DirectMessage],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
