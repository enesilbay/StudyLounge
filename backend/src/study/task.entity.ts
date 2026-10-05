import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Subject } from './subject.entity';

/** Kişisel yapılacaklar listesi maddesi. */
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 200 })
  title: string;

  @Column({ default: false })
  done: boolean;

  /** "Bu turda" işaretli görev; odada öne çıkarılır. */
  @Column({ default: false })
  current: boolean;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  subject: Subject | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  doneAt: Date | null;
}
