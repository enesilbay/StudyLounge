import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number; // ! işareti TypeScript'e "bu boş kalmayacak, güven bana" der.

  @Column({ unique: true })
  email!: string;

  @Column()
  fullName!: string;

  @Column({ default: false })
  isPremium!: boolean;
}