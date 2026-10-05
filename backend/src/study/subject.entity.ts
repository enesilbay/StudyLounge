import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

/** Kullanıcının kendi oluşturduğu ders (ör. "Fizik 2"). Oturumlar ve görevler derse bağlanabilir. */
@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 40 })
  name: string;

  /** Tema paletindeki renk anahtarı (web'de token'a çevrilir), ör. 'teal', 'rose'. */
  @Column({ length: 16, default: 'teal' })
  color: string;

  /** Arşivlenen ders seçicide görünmez ama geçmiş oturumlarda kalır. */
  @Column({ default: false })
  archived: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
