import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column()
  roomName: string; // Hangi lobide yazıldı?

  @ManyToOne(() => User, { eager: true })
  user: User; // Mesajı kim yazdı?

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
fileUrl: string; // Dosyanın sunucudaki yolu

@Column({ nullable: true })
fileName: string; // Dosyanın orijinal adı (Örn: "Diferansiyel_Denklemler.pdf")

@Column({ default: 'text' })
type: string; // 'text' veya 'file'
}