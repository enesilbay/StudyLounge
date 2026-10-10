import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type PaymentStatus = 'pending' | 'success' | 'failure';

/** Her Premium satin alma denemesi. Premium yalnizca iyzico'dan dogrulanan basarili kayitla verilir. */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  planId: string;

  /** Sunucudaki plan fiyati (TL); iyzico'dan donen tutarla karsilastirilir. */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: PaymentStatus;

  /** iyzico isteklerinde gonderilen, tahmin edilemeyen eslestirme kimligi. */
  @Index('UQ_payments_conversationId', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  conversationId: string;

  /** Odeme formu oturumunun token'i (callback bununla gelir). */
  @Index('UQ_payments_token', { unique: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  token: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  failureReason: string | null;

  /** Basarili odemeden sonra Premium'un uzatildigi tarih. */
  @Column({ type: 'timestamptz', nullable: true })
  premiumUntil: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
