import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column()
  roomName: string; // Hangi lobide yazildi?

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  user: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ default: 'text' })
  type: string;
}
