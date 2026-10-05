import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';

/** Biten bir haftanın ilk üçü ve aldıkları ödül. Aynı hafta iki kez ödüllendirilmez. */
@Entity('weekly_results')
@Unique(['weekStart', 'user'])
export class WeeklyResult {
  @PrimaryGeneratedColumn()
  id: number;

  /** Haftanın pazartesisi (Türkiye saati, YYYY-AA-GG). */
  @Column({ type: 'date' })
  weekStart: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  rank: number;

  @Column()
  minutes: number;

  /** Verilen Odak Puanı. */
  @Column()
  reward: number;

  @CreateDateColumn()
  createdAt: Date;
}
