import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export const ADMIN_ACTIONS = [
  'mute',
  'unmute',
  'ban',
  'unban',
  'role',
  'premium_grant',
  'premium_revoke',
  'verify_email',
  'delete_user',
  'report_resolve',
  'report_dismiss',
  'export_users',
] as const;
export type AdminActionType = (typeof ADMIN_ACTIONS)[number];

/**
 * Yönetici işlem kaydı: kim, kime, ne zaman, ne yaptı, neden. Kayıtlar düzenlenmez ve silinmez.
 * Yönetici ya da hedef silinse de kayıt kalır (ilişki boşalır, hedefin adı `targetLabel`'da saklanır).
 */
@Entity('admin_actions')
@Index('IDX_admin_actions_createdAt', ['createdAt'])
@Index('IDX_admin_actions_target', ['target', 'createdAt'])
export class AdminAction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  admin: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  target: User | null;

  /** İşlem anında yöneticinin kullanıcı adı; yönetici silinse de kimin yaptığı kalır. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  adminLabel: string | null;

  /** İşlem anındaki kullanıcı adı; hedef silinince kim olduğu buradan okunur. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  targetLabel: string | null;

  @Column({ type: 'varchar', length: 30 })
  action: AdminActionType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  /** Önceki/sonraki değer gibi ek bilgi (ör. { from: 'user', to: 'admin' }). */
  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
