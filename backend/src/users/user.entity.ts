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

  @Column({ nullable: true })
  avatarUrl: string;

}