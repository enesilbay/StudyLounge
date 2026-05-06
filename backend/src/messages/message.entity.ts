import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column()
  roomName: string; // Hangi lobide yazıldı?

  @ManyToOne(() => User, { eager: true })
  user: User; // Mesajı kim yazdı?

  @CreateDateColumn()
  createdAt: Date;
}