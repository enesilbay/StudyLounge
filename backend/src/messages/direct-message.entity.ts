import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('direct_messages')
export class DirectMessage {
  @PrimaryGeneratedColumn()
  id: number;

  // Hesap silinince o hesabin ozel mesajlari da silinir.
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  sender: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  receiver: User;

  @Column({ type: 'text' })
  text: string;

  @Column({ default: 'text' }) // text, image, pdf
  type: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
