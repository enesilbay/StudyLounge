import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('lobbies')
export class Lobby {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  icon!: string;

  @Column({ nullable: true })
  description?: string; // Nullable olduğu için '?' de kullanabilirsin

  @Column({ default: 0 })
  activeUsers!: number;

  @Column({ default: false })
  isPrivate!: boolean;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: 50 })
  maxUsers!: number;

  @Column({ nullable: true })
  ownerId?: number;

  @Column({ default: false })
  isPremiumOnly!: boolean;
}
