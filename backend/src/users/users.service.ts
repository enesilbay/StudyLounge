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
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';

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

  private stripPassword(user: User): User {
    delete user.password;
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

  // ── AŞAMA 4: DÜELLO BAKİYE YÖNETİMİ ──
  async addCoins(userId: number, amount: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) return;
    user.coins = (user.coins || 0) + amount;
    await this.usersRepository.save(user);
  }

  async removeCoins(userId: number, amount: number): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || (user.coins || 0) < amount) return false;
    user.coins -= amount;
    await this.usersRepository.save(user);
    return true;
  }

  // ── 3. ODAKLANMA PUANI VE OYUNLAŞTIRMA (AŞAMA 3) ──
  async addFocusTime(userId: number, minutes: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (user) {
      user.totalFocusMinutes = (user.totalFocusMinutes || 0) + minutes;

      // STREAK HESAPLAMASI
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const currentHour = now.getHours();

      let streakMultiplier = 0;
      if (user.lastFocusDate) {
        const lastFocusString = user.lastFocusDate.toISOString().split('T')[0];
        if (lastFocusString !== todayString) {
          const diffTime = Math.abs(now.getTime() - user.lastFocusDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 2) { // Sonraki gün
            user.currentStreak += 1;
          } else { // Seri bozuldu
            user.currentStreak = 1;
          }
          user.lastFocusDate = now;
        }
      } else {
        user.currentStreak = 1;
        user.lastFocusDate = now;
      }
      if (user.currentStreak > user.bestStreak) user.bestStreak = user.currentStreak;

      // COIN HESAPLAMASI (Örn: Streak başına %10 bonus, max %50)
      streakMultiplier = Math.min(user.currentStreak, 5) * 0.1;
      const earnedCoins = Math.floor(minutes * (1 + streakMultiplier));
      user.coins = (user.coins || 0) + earnedCoins;

      // BAŞARIMLAR (BADGES)
      if (!user.badges) user.badges = [];
      if (minutes >= 120 && !user.badges.includes('Maratoncu')) {
        user.badges.push('Maratoncu');
      }
      if ((currentHour >= 0 && currentHour <= 5) && minutes >= 60 && !user.badges.includes('Gece Kuşu')) {
        user.badges.push('Gece Kuşu');
      }

      await this.usersRepository.save(user);

      // Günlük analitik tablosuna da ekle
      const today = todayString;
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

  // ── AŞAMA 4: ARKADAŞ İÇİ LİDERLİK TABLOSU ──
  async getFriendsLeaderboard(userId: number) {
    const friends = await this.getFriends(userId);
    const currentUser = await this.findById(userId);
    
    if (currentUser) {
      friends.push({
        id: currentUser.id,
        username: currentUser.username,
        fullName: currentUser.fullName,
        totalFocusMinutes: currentUser.totalFocusMinutes,
        avatarUrl: currentUser.avatarUrl,
        isOnline: currentUser.isOnline,
        currentRoom: currentUser.currentRoom,
      } as any);
    }

    return friends.sort((a, b) => (b.totalFocusMinutes || 0) - (a.totalFocusMinutes || 0));
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
        isOnline: friend.isOnline,
        currentRoom: friend.currentRoom,
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
    return this.stripPassword(updatedUser);
  }

  // ── 11. PREMIUM YAP (YENİ EKLENDİ) ──
  async upgradeToPremium(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    user.isPremium = true;
    const updatedUser = await this.usersRepository.save(user);
    return this.stripPassword(updatedUser);
  }

  // ── PROFİL GÜNCELLEME (İSİM) ──
  async updateProfile(userId: number, fullName: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    user.fullName = fullName;
    const updated = await this.usersRepository.save(user);
    return this.stripPassword(updated);
  }

  async updateAccountSettings(
    userId: number,
    settings: UpdateAccountSettingsDto,
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    if (settings.username && settings.username !== user.username) {
      const existingUsername = await this.usersRepository.findOne({
        where: { username: settings.username },
      });
      if (existingUsername && existingUsername.id !== userId) {
        throw new BadRequestException('Bu kullanıcı adı zaten kullanılıyor.');
      }
      user.username = settings.username;
    }

    if (settings.email && settings.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: settings.email },
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
      }
      user.email = settings.email;
    }

    if (settings.newPassword) {
      if (
        !settings.currentPassword ||
        !user.password ||
        !(await bcrypt.compare(settings.currentPassword, user.password))
      ) {
        throw new BadRequestException('Mevcut şifre hatalı.');
      }
      user.password = await bcrypt.hash(settings.newPassword, 10);
    }

    const updatedUser = await this.usersRepository.save(user);
    return this.stripPassword(updatedUser);
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

  // ── 15. KULLANICI ONLINE DURUMU VE ODASI ──
  async setOnlineStatus(userId: number, isOnline: boolean, roomName?: string | null) {
    await this.usersRepository.update(userId, { isOnline, currentRoom: roomName || null });
  }

  // ── AŞAMA 3: MAĞAZA İŞLEMLERİ ──
  async buyItem(userId: number, itemType: 'color' | 'icon', itemId: string, price: number) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    if (user.coins < price) {
      throw new BadRequestException('Yetersiz Odak Puanı (Coin)');
    }

    if (itemType === 'color') {
      if (user.ownedColors.includes(itemId)) throw new BadRequestException('Bu renge zaten sahipsiniz');
      user.ownedColors.push(itemId);
    } else {
      if (user.ownedIcons.includes(itemId)) throw new BadRequestException('Bu ikona zaten sahipsiniz');
      user.ownedIcons.push(itemId);
    }

    user.coins -= price;
    return await this.usersRepository.save(user);
  }

  async equipItem(userId: number, itemType: 'color' | 'icon', itemId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    if (itemType === 'color') {
      if (!user.ownedColors.includes(itemId) && itemId !== '#4F46E5') {
        throw new BadRequestException('Bu renge sahip değilsiniz');
      }
      user.equippedBubbleColor = itemId;
    } else {
      if (!user.ownedIcons.includes(itemId) && itemId !== '') {
        throw new BadRequestException('Bu ikona sahip değilsiniz');
      }
      user.equippedIcon = itemId;
    }

    return await this.usersRepository.save(user);
  }
}
