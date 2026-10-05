import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';

/** `blocker`, `blocked` kişisini engelledi. Etki iki yönlüdür: DM, düello, dürtme ve istek kapanır. */
@Entity('blocks')
@Unique(['blocker', 'blocked'])
export class Block {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  blocked: User;

  @CreateDateColumn()
  createdAt: Date;
}
