import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export const FEEDBACK_KINDS = ['bug', 'idea', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export type FeedbackStatus = 'open' | 'done';

/** Uygulama içinden gönderilen hata bildirimi ya da öneri (beta geri bildirimi). */
@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 10 })
  kind: FeedbackKind;

  @Column({ type: 'varchar', length: 2000 })
  message: string;

  /** Gönderildiği sayfa (ör. /app/lobbies); hatayı yeniden üretmeye yardım eder. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  page: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;

  @Column({ length: 10, default: 'open' })
  status: FeedbackStatus;

  @CreateDateColumn()
  createdAt: Date;
}
