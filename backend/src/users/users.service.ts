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

  // ── 1. KAYIT OL (Şifreli ve Regex Korumalı) ──
  async create(userData: Partial<User>): Promise<User> {
    // 1. Kullanıcı adı (username) kontrolü: Sadece harf, rakam ve alt çizgi. Boşluk YASAK!
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

    // 2. Email kontrolü
    const existingEmail = await this.usersRepository.findOne({ where: { email: userData.email } });
    if (existingEmail) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
    }

    // 3. Şifre kontrolü ve Hashleme
    if (!userData.password) {
      throw new BadRequestException('Şifre alanı zorunludur.');
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // 4. Kayıt İşlemi
    const newUser = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });
    
    const savedUser = await this.usersRepository.save(newUser);
    delete savedUser.password; // Şifreyi geri döndürme
    
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

  // ── 5. LİDERLİK TABLOSU ──
  async getLeaderboard(): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        totalFocusMinutes: 'DESC',
      },
      take: 10,
      select: ['id', 'username', 'fullName', 'totalFocusMinutes', 'isPremium'] 
    });
  }

  // ── 6. ARKADAŞLIK İSTEĞİ GÖNDERME ──
  async sendFriendRequest(senderId: number, receiverUsername: string) {
    const sender = await this.usersRepository.findOne({ where: { id: senderId } });
    const receiver = await this.usersRepository.findOne({ where: { username: receiverUsername } });

    // HATA ÇÖZÜMÜ: Gönderen kişinin (sender) var olduğundan emin oluyoruz.
    if (!sender) {
      throw new NotFoundException('Gönderen kullanıcı bulunamadı (Oturum hatası).');
    }

    if (!receiver) {
      throw new NotFoundException(`'${receiverUsername}' adında bir kullanıcı bulunamadı!`);
    }
    
    if (sender.id === receiver.id) {
      throw new BadRequestException('Kendinize arkadaşlık isteği gönderemezsiniz.');
    }

    // Daha önce istek atılmış mı kontrolü
    const existingRequest = await this.friendshipRepository.findOne({
      where: [
        { sender: { id: sender.id }, receiver: { id: receiver.id } },
        { sender: { id: receiver.id }, receiver: { id: sender.id } }
      ]
    });

    if (existingRequest) {
      throw new BadRequestException('Bu kişiyle zaten arkadaşsınız veya bekleyen bir isteğiniz var.');
    }

    // İsteği oluştur
    const friendship = this.friendshipRepository.create({
      sender,
      receiver,
      status: 'pending' // Beklemede
    });

    return this.friendshipRepository.save(friendship);
  }

  // ── 7. BANA GELEN İSTEKLERİ GETİR ──
  async getPendingRequests(userId: number) {
    return this.friendshipRepository.find({
      where: { receiver: { id: userId }, status: 'pending' },
      relations: ['sender'], // İsteği atan kişinin bilgilerini de getir
      select: {
        id: true,
        status: true,
        sender: { id: true, username: true, fullName: true } // Sadece bu bilgileri al (Şifreyi alma)
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

  // ── 9. ARKADAŞLARIMI LİSTELE ──
  async getFriends(userId: number) {
    // Hem benim gönderip kabul edilenler, hem de bana gelip kabul ettiklerim
    const friendships = await this.friendshipRepository.find({
      where: [
        { sender: { id: userId }, status: 'accepted' },
        { receiver: { id: userId }, status: 'accepted' }
      ],
      relations: ['sender', 'receiver']
    });

    // Sadece arkadaşın bilgilerini ayıklayıp temiz bir liste döndürelim
    return friendships.map(f => {
      const friend = f.sender.id === userId ? f.receiver : f.sender;
      return {
        id: friend.id,
        username: friend.username,
        fullName: friend.fullName,
        totalFocusMinutes: friend.totalFocusMinutes
      };
    });
  }
}