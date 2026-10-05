import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // YENİ EKLENDİ: Benzersiz kullanıcı adı
  @Column({ unique: true })
  username: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  // Gizli alanlar (select: false) hicbir sorguda ya da iliskide (or. mesajin
  // yazari) kendiliginden yuklenmez; gereken akislar acikca addSelect eder.
  @Column({ nullable: true, select: false })
  password?: string;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: 0 })
  totalFocusMinutes: number;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'varchar', nullable: true })
  currentRoom: string | null;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, select: false })
  expoPushToken: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  emailVerificationToken: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date | null;

  // Dogrulama / sifre sifirlama kodu icin ust uste yanlis deneme sayisi.
  @Column({ default: 0, select: false })
  codeAttempts: number;

  // ── AŞAMA 3: OYUNLAŞTIRMA VE EKONOMİ ──
  @Column({ default: 0 })
  coins: number;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  bestStreak: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFocusDate: Date | null;

  @Column('simple-array', { default: '' })
  ownedColors: string[];

  @Column('simple-array', { default: '' })
  ownedIcons: string[];

  @Column('simple-array', { default: '' })
  badges: string[];

  @Column({ default: '#4F46E5' })
  equippedBubbleColor: string;

  @Column({ nullable: true })
  equippedIcon: string;

  @Column('simple-array', { default: 'classic' })
  ownedSoundPacks: string[];

  @Column({ default: 'classic' })
  equippedSoundPack: string;

  @Column('simple-array', { default: 'none' })
  ownedProfileFrames: string[];

  @Column({ default: 'none' })
  equippedProfileFrame: string;

  // ── HEDEFLER (0 = kapalı) ──
  @Column({ default: 0 })
  dailyGoalMinutes: number;

  @Column({ default: 0 })
  weeklyGoalMinutes: number;
}
