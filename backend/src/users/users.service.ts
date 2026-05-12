import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Friendship } from './friendship.entity';
import { DailyAnalytics } from './daily-analytics.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(DailyAnalytics)
    private dailyAnalyticsRepository: Repository<DailyAnalytics>,
  ) {}

  // ── 1. KAYIT OL ──
  async create(userData: Partial<User>): Promise<User> {
    if (userData.username) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(userData.username)) {
        throw new BadRequestException(
          'Kullanıcı adında boşluk veya geçersiz karakter olamaz! Sadece harf, rakam ve alt çizgi (_) kullanın.',
        );
      }
      const existingUsername = await this.usersRepository.findOne({
        where: { username: userData.username },
      });
      if (existingUsername) {
        throw new BadRequestException(
          'Bu kullanıcı adı maalesef çoktan alınmış.',
        );
      }
    } else {
      throw new BadRequestException('Kullanıcı adı alanı zorunludur.');
    }

    const existingEmail = await this.usersRepository.findOne({
      where: { email: userData.email },
    });
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

  // ── KULLANICI BUL (JWT İÇİN) ──
  async findById(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      delete user.password;
    }
    return user;
  }

  // ── KULLANICI BUL (E-POSTA İLE) ──
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // ── ŞİFRE SIFIRLAMA TOKEN GÜNCELLE ──
  async updateResetToken(userId: number, token: string, expiry: Date) {
    await this.usersRepository.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expiry,
    });
  }

  // ── ŞİFRE GÜNCELLE ──
  async updatePassword(userId: number, hashedPass: string) {
    await this.usersRepository.update(userId, {
      password: hashedPass,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  // ── 3. ODAKLANMA PUANI ──
  async addFocusTime(userId: number, minutes: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (user) {
      user.totalFocusMinutes = (user.totalFocusMinutes || 0) + minutes;
      await this.usersRepository.save(user);

      // YENİ: Günlük analitik tablosuna da ekle
      const today = new Date().toISOString().split('T')[0];
      let daily = await this.dailyAnalyticsRepository.findOne({
        where: { user: { id: userId }, date: today },
      });

      if (!daily) {
        daily = this.dailyAnalyticsRepository.create({
          user: user,
          date: today,
          focusMinutes: minutes,
          hourlyDistribution: Array<number>(24).fill(0),
        });
      } else {
        daily.focusMinutes += minutes;
        if (
          !daily.hourlyDistribution ||
          daily.hourlyDistribution.length !== 24
        ) {
          daily.hourlyDistribution = Array<number>(24).fill(0);
        }
      }

      const currentHour = new Date().getHours();
      daily.hourlyDistribution[currentHour] += minutes;

      await this.dailyAnalyticsRepository.save(daily);

      console.log(
        `${user.fullName} için ${minutes} dakika eklendi. Yeni Toplam: ${user.totalFocusMinutes}`,
      );
      return user;
    }
    return null;
  }

  // YENİ: HAFTALIK ANALİTİK VERİSİ
  async getWeeklyAnalytics(userId: number) {
    // Son 7 günün verilerini getir
    const today = new Date();
    const pastWeek = new Date(today);
    pastWeek.setDate(pastWeek.getDate() - 6); // Son 7 gün (bugün dahil)

    const dateString = pastWeek.toISOString().split('T')[0];

    const records = await this.dailyAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.date >= :dateString', { dateString })
      .orderBy('analytics.date', 'ASC')
      .getMany();

    return records;
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
      select: [
        'id',
        'username',
        'fullName',
        'totalFocusMinutes',
        'isPremium',
        'avatarUrl',
      ],
    });
  }

  // ── 6. ARKADAŞLIK İSTEĞİ GÖNDERME ──
  async sendFriendRequest(senderId: number, receiverUsername: string) {
    const sender = await this.usersRepository.findOne({
      where: { id: senderId },
    });
    const receiver = await this.usersRepository.findOne({
      where: { username: receiverUsername },
    });

    if (!sender) {
      throw new NotFoundException(
        'Gönderen kullanıcı bulunamadı (Oturum hatası).',
      );
    }

    if (!receiver) {
      throw new NotFoundException(
        `'${receiverUsername}' adında bir kullanıcı bulunamadı!`,
      );
    }

    if (sender.id === receiver.id) {
      throw new BadRequestException(
        'Kendinize arkadaşlık isteği gönderemezsiniz.',
      );
    }

    const existingRequest = await this.friendshipRepository.findOne({
      where: [
        { sender: { id: sender.id }, receiver: { id: receiver.id } },
        { sender: { id: receiver.id }, receiver: { id: sender.id } },
      ],
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Bu kişiyle zaten arkadaşsınız veya bekleyen bir isteğiniz var.',
      );
    }

    const friendship = this.friendshipRepository.create({
      sender,
      receiver,
      status: 'pending',
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
        sender: { id: true, username: true, fullName: true, avatarUrl: true },
      },
    });
  }

  // ── 8. İSTEĞİ KABUL ET VEYA REDDET ──
  async respondToRequest(
    requestId: number,
    receiverId: number,
    status: 'accepted' | 'rejected',
  ) {
    const request = await this.friendshipRepository.findOne({
      where: { id: requestId, receiver: { id: receiverId }, status: 'pending' },
    });

    if (!request) {
      throw new NotFoundException(
        'Böyle bir istek bulunamadı veya zaten yanıtlanmış.',
      );
    }

    request.status = status;
    return this.friendshipRepository.save(request);
  }

  // ── 9. ARKADAŞLARIMI LİSTELE (Avatar Eklendi) ──
  async getFriends(userId: number) {
    const friendships = await this.friendshipRepository.find({
      where: [
        { sender: { id: userId }, status: 'accepted' },
        { receiver: { id: userId }, status: 'accepted' },
      ],
      relations: ['sender', 'receiver'],
    });

    return friendships.map((f) => {
      const friend = f.sender.id === userId ? f.receiver : f.sender;
      return {
        id: friend.id,
        username: friend.username,
        fullName: friend.fullName,
        totalFocusMinutes: friend.totalFocusMinutes,
        avatarUrl: friend.avatarUrl,
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

  // ── PROFİL GÜNCELLEME (İSİM) ──
  async updateProfile(userId: number, fullName: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    user.fullName = fullName;
    const updated = await this.usersRepository.save(user);
    delete updated.password;
    return updated;
  }

  // ── 12. PUSH TOKEN GÜNCELLEME (YENİ EKLENDİ) ──
  async updatePushToken(userId: number, token: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    user.expoPushToken = token;
    return this.usersRepository.save(user);
  }

  // ── 13. ARKADAŞLARIN PUSH TOKENLARINI GETİR ──
  async getFriendsPushTokens(userId: number): Promise<string[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { sender: { id: userId }, status: 'accepted' },
        { receiver: { id: userId }, status: 'accepted' },
      ],
      relations: ['sender', 'receiver'],
    });

    const tokens = friendships
      .map((f) => {
        const friend = f.sender.id === userId ? f.receiver : f.sender;
        return friend.expoPushToken;
      })
      .filter((token) => !!token);

    return tokens;
  }

  // ── 14. BELİRLİ KULLANICILARIN PUSH TOKENLARINI GETİR (NUDGE İÇİN) ──
  async getUserPushTokens(userIds: number[]): Promise<string[]> {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: userIds })
      .andWhere('user.expoPushToken IS NOT NULL')
      .getMany();

    return users.map((u) => u.expoPushToken).filter((t): t is string => !!t);
  }
}
