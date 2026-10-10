import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'cheating',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

/** Kullanıcı ya da mesaj şikayeti. Mesaj silinse de inceleme için metni saklanır. */
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reporter: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  target: User;

  @Column({ length: 20 })
  reason: ReportReason;

  @Column({ type: 'varchar', length: 500, nullable: true })
  details: string | null;

  /** Şikayet edilen oda mesajı (varsa) ve o anki metni. */
  @Column({ type: 'integer', nullable: true })
  messageId: number | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  messageText: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  roomName: string | null;

  @Column({ length: 10, default: 'open' })
  status: ReportStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  resolvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
