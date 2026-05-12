import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('friendships')
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  receiver: User;

  // 'pending' (Bekliyor), 'accepted' (Kabul Edildi), 'rejected' (Reddedildi)
  @Column({ default: 'pending' })
  status: string;
}
