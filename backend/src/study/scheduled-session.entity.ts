import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Lobby } from '../lobbies/lobby.entity';
import { User } from '../users/user.entity';

/** Arkadaşlarla ileri tarihe planlanan çalışma oturumu. */
@Entity('scheduled_sessions')
export class ScheduledSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @Column({ length: 80 })
  title: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ default: 50 })
  durationMinutes: number;

  /** Oturumun yapılacağı oda; oda silinirse (24 saat) plan odasız kalır. */
  @ManyToOne(() => Lobby, { nullable: true, onDelete: 'SET NULL' })
  lobby: Lobby | null;

  /** Başlamadan önceki hatırlatma gönderildi mi (tekrar gönderilmesin). */
  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null;

  @OneToMany(() => ScheduledSessionInvite, (invite) => invite.session)
  invites: ScheduledSessionInvite[];

  @CreateDateColumn()
  createdAt: Date;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined';

@Entity('scheduled_session_invites')
@Unique(['session', 'user'])
export class ScheduledSessionInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ScheduledSession, (session) => session.invites, { onDelete: 'CASCADE' })
  session: ScheduledSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 10, default: 'pending' })
  status: InviteStatus;
}
