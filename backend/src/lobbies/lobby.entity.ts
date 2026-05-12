import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('lobbies')
export class Lobby {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  icon!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 0 })
  activeUsers!: number;

  @Column({ default: false })
  isPrivate!: boolean;

  @Column({ nullable: true, select: false })
  passwordHash?: string;

  @Column({ default: 50 })
  maxUsers!: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  owner?: User | null;

  @Column({ default: false })
  isPremiumOnly!: boolean;
}
