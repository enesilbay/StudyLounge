import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('daily_analytics')
export class DailyAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  focusMinutes: number;

  @Column({ type: 'jsonb', nullable: true })
  hourlyDistribution: number[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
