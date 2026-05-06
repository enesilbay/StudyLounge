import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Friendship } from './friendship.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
  ) {}

  // ── 1. KAYIT OL ──
  async create(userData: Partial<User>): Promise<User> {
    if (userData.username) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(userData.username)) {
        throw new BadRequestException('Kullanıcı adında boşluk veya geçersiz karakter olamaz! Sadece harf, rakam ve alt çizgi (_) kullanın.');
      }
      const existingUsername = await this.usersRepository.findOne({ where: { username: userData.username } });
      if (existingUsername) {
        throw new BadRequestException('Bu kullanıcı adı maalesef çoktan alınmış.');
      }
    } else {
      throw new BadRequestException('Kullanıcı adı alanı zorunludur.');
    }

    const existingEmail = await this.usersRepository.findOne({ where: { email: userData.email } });
    if (existingEmail) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
    }

    if (!userData.password) {
      throw new BadRequestException('Şifre alanı zorunludur.');
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

  // ── 2. GİRİŞ YAP ──
  async login(email: string, pass: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      delete user.password; 
      return user;
    }
    return null; 
  }

  // ── 3. ODAKLANMA PUANI ──
  async addFocusTime(userId: number, minutes: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (user) {
      user.totalFocusMinutes = (user.totalFocusMinutes || 0) + minutes;
      console.log(`${user.fullName} için ${minutes} dakika eklendi. Yeni Toplam: ${user.totalFocusMinutes}`);
      return await this.usersRepository.save(user);
    }
    return null;
  }

  // ── 4. TÜM KULLANICILAR ──
  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  // ── 5. LİDERLİK TABLOSU (Avatar Eklendi) ──
  async getLeaderboard(): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        totalFocusMinutes: 'DESC',
      },
      take: 10,
      select: ['id', 'username', 'fullName', 'totalFocusMinutes', 'isPremium', 'avatarUrl'] 
    });
  }

  // ── 6. ARKADAŞLIK İSTEĞİ GÖNDERME ──
  async sendFriendRequest(senderId: number, receiverUsername: string) {
    const sender = await this.usersRepository.findOne({ where: { id: senderId } });
    const receiver = await this.usersRepository.findOne({ where: { username: receiverUsername } });

    if (!sender) {
      throw new NotFoundException('Gönderen kullanıcı bulunamadı (Oturum hatası).');
    }

    if (!receiver) {
      throw new NotFoundException(`'${receiverUsername}' adında bir kullanıcı bulunamadı!`);
    }
    
    if (sender.id === receiver.id) {
      throw new BadRequestException('Kendinize arkadaşlık isteği gönderemezsiniz.');
    }

    const existingRequest = await this.friendshipRepository.findOne({
      where: [
        { sender: { id: sender.id }, receiver: { id: receiver.id } },
        { sender: { id: receiver.id }, receiver: { id: sender.id } }
      ]
    });

    if (existingRequest) {
      throw new BadRequestException('Bu kişiyle zaten arkadaşsınız veya bekleyen bir isteğiniz var.');
    }

    const friendship = this.friendshipRepository.create({
      sender,
      receiver,
      status: 'pending' 
    });

    return this.friendshipRepository.save(friendship);
  }

  // ── 7. BANA GELEN İSTEKLERİ GETİR (Avatar Eklendi) ──
  async getPendingRequests(userId: number) {
    return this.friendshipRepository.find({
      where: { receiver: { id: userId }, status: 'pending' },
      relations: ['sender'], 
      select: {
        id: true,
        status: true,
        sender: { id: true, username: true, fullName: true, avatarUrl: true } 
      }
    });
  }

  // ── 8. İSTEĞİ KABUL ET VEYA REDDET ──
  async respondToRequest(requestId: number, receiverId: number, status: 'accepted' | 'rejected') {
    const request = await this.friendshipRepository.findOne({
      where: { id: requestId, receiver: { id: receiverId }, status: 'pending' }
    });

    if (!request) {
      throw new NotFoundException('Böyle bir istek bulunamadı veya zaten yanıtlanmış.');
    }

    request.status = status;
    return this.friendshipRepository.save(request);
  }

  // ── 9. ARKADAŞLARIMI LİSTELE (Avatar Eklendi) ──
  async getFriends(userId: number) {
    const friendships = await this.friendshipRepository.find({
      where: [
        { sender: { id: userId }, status: 'accepted' },
        { receiver: { id: userId }, status: 'accepted' }
      ],
      relations: ['sender', 'receiver']
    });

    return friendships.map(f => {
      const friend = f.sender.id === userId ? f.receiver : f.sender;
      return {
        id: friend.id,
        username: friend.username,
        fullName: friend.fullName,
        totalFocusMinutes: friend.totalFocusMinutes,
        avatarUrl: friend.avatarUrl
      };
    });
  }

  // ── 10. AVATAR GÜNCELLEME (YENİ EKLENDİ) ──
  async updateAvatar(userId: number, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    user.avatarUrl = avatarUrl;
    const updatedUser = await this.usersRepository.save(user);
    delete updatedUser.password;
    return updatedUser;
  }

  // ── 11. PREMIUM YAP (YENİ EKLENDİ) ──
  async upgradeToPremium(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    user.isPremium = true;
    const updatedUser = await this.usersRepository.save(user);
    delete updatedUser.password;
    return updatedUser;
  }

}