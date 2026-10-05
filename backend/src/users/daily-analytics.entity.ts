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

  /** Günlük hedef bonusu bu gün için verildi mi (günde bir kez). */
  @Column({ default: false })
  goalRewarded: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
