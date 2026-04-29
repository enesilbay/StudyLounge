import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: false })
  isPremium: boolean;

  // Yeni eklediğimiz sütun: Toplam odaklanma süresi (dakika cinsinden)
  @Column({ default: 0 })
  totalFocusMinutes: number;
}