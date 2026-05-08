import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('friendships')
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  sender: User;

  @ManyToOne(() => User)
  receiver: User;

  // 'pending' (Bekliyor), 'accepted' (Kabul Edildi), 'rejected' (Reddedildi)
  @Column({ default: 'pending' })
  status: string;
}
