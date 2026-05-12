import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Lobby } from './lobbies/lobby.entity';
import { Message } from './messages/message.entity';
import { DailyAnalytics } from './users/daily-analytics.entity';
import { Friendship } from './users/friendship.entity';
import { User } from './users/user.entity';

config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USER ?? 'enes_admin',
  password: process.env.DB_PASSWORD ?? 'studylounge_secret',
  database: process.env.DB_NAME ?? 'studylounge',
  entities: [User, Lobby, Friendship, DailyAnalytics, Message],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
