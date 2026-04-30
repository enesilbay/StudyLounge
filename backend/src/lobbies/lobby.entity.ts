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
}