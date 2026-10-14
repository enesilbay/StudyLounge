import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export const ANNOUNCEMENT_TONES = ['info', 'warning'] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

/** Uygulamanın üstünde görünen kısa duyuru (bakım, yeni özellik). Başlangıç ve bitiş arasında yayındadır. */
@Entity('announcements')
@Index('IDX_announcements_window', ['startsAt', 'endsAt'])
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 280 })
  message: string;

  @Column({ type: 'varchar', length: 10, default: 'info' })
  tone: AnnouncementTone;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  /** Yazan yönetici; hesabı silinirse duyuru kalır. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  createdBy: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
