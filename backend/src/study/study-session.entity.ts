import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Subject } from './subject.entity';

/** Tek bir odak oturumu: masaya geçişten kalkışa kadar. */
@Entity('study_sessions')
@Index(['user', 'startedAt'])
export class StudySession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  /** Ders silinirse oturum derssiz kalır. */
  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  subject: Subject | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  roomName: string | null;

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz' })
  endedAt: Date;

  /** Gerçek süre (dakika). */
  @Column({ default: 0 })
  minutes: number;

  /** Puana yazılan süre; Elite odalarda gerçek sürenin iki katı. */
  @Column({ default: 0 })
  creditedMinutes: number;

  @Column({ length: 10, default: 'mobile' })
  source: string;
}
