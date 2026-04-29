import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // 1. KAYIT OL (Şifreli)
  async create(userData: Partial<User>): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new Error('Bu e-posta adresi zaten kullanılıyor.');
    }

    // TypeScript'i rahatlatıyoruz: Şifre yoksa hata fırlat
    if (!userData.password) {
      throw new Error('Şifre alanı zorunludur.');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });
    
    const savedUser = await this.usersRepository.save(newUser);
    delete savedUser.password;
    
    return savedUser;
  }

  // 2. GİRİŞ YAP
  async login(email: string, pass: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    
    // Kullanıcı varsa, şifresi varsa ve şifreler eşleşiyorsa
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      delete user.password; 
      return user;
    }
    return null; 
  }

  // 3. SİLİNEN ODAKLANMA PUANI METODUMUZ (Geri geldi)
  async addFocusTime(userId: number, minutes: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (user) {
      user.totalFocusMinutes = (user.totalFocusMinutes || 0) + minutes;
      console.log(`${user.fullName} için ${minutes} dakika eklendi. Yeni Toplam: ${user.totalFocusMinutes}`);
      return await this.usersRepository.save(user);
    }
    return null;
  }

  // 4. SİLİNEN TÜM KULLANICILARI GETİR METODUMUZ (Geri geldi)
  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }
}