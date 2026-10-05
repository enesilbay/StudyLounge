import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { Lobby } from './lobby.entity';

/** Şifreli odanın şifresini doğru giren kullanıcı. Oda silinince kayıt da silinir. */
@Entity('lobby_access')
@Unique(['lobby', 'user'])
export class LobbyAccess {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Lobby, { onDelete: 'CASCADE' })
  lobby!: Lobby;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
