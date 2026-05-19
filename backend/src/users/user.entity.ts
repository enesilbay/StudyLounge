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

  @Column({ nullable: true })
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

  @Column({ nullable: true })
  expoPushToken: string;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

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
}
