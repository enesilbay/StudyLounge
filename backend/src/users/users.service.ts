import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Yeni bir kullanıcı oluşturma (Kayıt)
  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return await this.usersRepository.save(newUser);
  }

  // Tüm kullanıcıları listeleme (Test için)
  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async addFocusTime(userId: number, minutes: number) {
  const user = await this.usersRepository.findOneBy({ id: userId });
  if (user) {
    user.totalFocusMinutes += minutes;
    console.log(`${user.fullName} için ${minutes} dakika eklendi. Yeni Toplam: ${user.totalFocusMinutes}`);
    return await this.usersRepository.save(user);
  }
}
}