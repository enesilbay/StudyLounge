import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from './user.entity';
import { Friendship } from './friendship.entity';
import { DailyAnalytics } from './daily-analytics.entity';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';
import { MAX_STREAK_FREEZES, SHOP_CATALOG, findShopItem } from './shop-catalog';
import { advanceStreak } from './streak';
import { BADGES, BADGE_NAMES, focusBadges } from './badges';
import {
  addDaysToKey,
  daysBetweenKeys,
  localDayKey,
  localHour,
  localWeekStartKey,
} from '../config/time';
import type { ShopItemType } from './shop-catalog';

/** Dogrulama / sifirlama kodu bu kadar yanlis denemeden sonra gecersiz olur. */
export const MAX_CODE_ATTEMPTS = 5;

/** E-posta dogrulama kodunun gecerlilik suresi. */
export const VERIFICATION_CODE_TTL_MS = 15 * 60_000;

/** 6 haneli, kriptografik olarak rastgele kod. */
export function generateVerificationCode(): string {
  return randomInt(100000, 1000000).toString();
}

/** Ayar degisikliginin sonucu: guncel (temiz) kullanici ve yan etkiler. */
export interface AccountSettingsResult {
  user: User & { hasPassword: boolean };
  emailChanged: boolean;
  passwordChanged: boolean;
  /** E-posta degistiyse yeni adrese gonderilecek dogrulama kodu. */
  verificationCode: string | null;
}

const KNOWN_BADGES = new Set(BADGES.map((badge) => badge.name));

@Injectable()
export class UsersService implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(DailyAnalytics)
    private dailyAnalyticsRepository: Repository<DailyAnalytics>,
  ) {}

  async onModuleInit() {
    try {
      await this.usersRepository.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerificationToken" varchar;
      `);
      console.log('[UsersService] PostgreSQL veritabanı sütunları doğrulandı.');
    } catch (e) {
      console.warn('[UsersService] Sütun doğrulama uyarısı:', e);
    }
  }

  /**
   * Sunucu yeniden basladiginda onceki surecten kalan canli durum temizlenir:
   * tum soketler zaten kopmustur, kimse bir odada degildir.
   */
  async onApplicationBootstrap() {
    try {
      await this.usersRepository
        .createQueryBuilder()
        .update(User)
        .set({ isOnline: false, currentRoom: null })
        .where('"isOnline" = true OR "currentRoom" IS NOT NULL')
        .execute();
    } catch (e) {
      console.warn('[UsersService] Çevrimiçi durum sıfırlanamadı:', e);
    }
  }

  /** E-postaya gore buyuk/kucuk harf duyarsiz arama. */
  private findByEmailInsensitive(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect(['user.emailVerificationToken', 'user.emailVerificationExpires'])
      .where('LOWER(user.email) = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  // ── 1. KAYIT OL ──
  /**
   * Yeni hesap açar. E-postası ya da kullanıcı adı, doğrulanmamış (terk edilmiş) bir kayıtta
   * duruyorsa o kayıt yeni bilgilerle yeniden kullanılır; böylece yanlış e-postayla kayıt
   * olan kullanıcı sıkışmaz. Doğrulanmış hesabın e-postası/kullanıcı adı korunur.
   */
  async create(userData: Partial<User>): Promise<User> {
    if (!userData.username) {
      throw new BadRequestException('Kullanıcı adı alanı zorunludur.');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
      throw new BadRequestException(
        'Kullanıcı adında boşluk veya geçersiz karakter olamaz! Sadece harf, rakam ve alt çizgi (_) kullanın.',
      );
    }
    if (!userData.password || userData.password.length < 8) {
      throw new BadRequestException(
        'Şifre alanı zorunludur ve en az 8 karakter olmalıdır.',
      );
    }
    const email = (userData.email ?? '').trim().toLowerCase();

    const sameEmail = email ? await this.findByEmailInsensitive(email) : null;
    if (sameEmail?.isEmailVerified) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
    }
    const sameUsername = await this.usersRepository.findOne({
      where: { username: userData.username },
    });
    // Kullanıcı adı başka bir kayıttaysa: doğrulanmışsa alınmıştır; doğrulanmamışsa terk edilmiş sayılır.
    const usernameOwner =
      sameUsername && sameUsername.id !== sameEmail?.id ? sameUsername : null;
    if (usernameOwner?.isEmailVerified) {
      throw new BadRequestException('Bu kullanıcı adı maalesef çoktan alınmış.');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const code = generateVerificationCode();
    const expires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    // Terk edilmiş kayıtlardan biri yeniden kullanılır, diğeri (varsa) silinir.
    const reusable = sameEmail ?? usernameOwner;
    if (reusable) {
      if (sameEmail && usernameOwner) {
        await this.usersRepository.delete({ id: usernameOwner.id });
      }
      reusable.username = userData.username;
      reusable.email = email;
      reusable.fullName = userData.fullName ?? reusable.fullName;
      reusable.password = hashedPassword;
      reusable.isEmailVerified = false;
      reusable.emailVerificationToken = code;
      reusable.emailVerificationExpires = expires;
      reusable.codeAttempts = 0;
      if (userData.avatarUrl) reusable.avatarUrl = userData.avatarUrl;
      const saved = await this.usersRepository.save(reusable);
      delete saved.password;
      return saved;
    }

    const newUser = this.usersRepository.create({
      ...userData,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationToken: code,
      emailVerificationExpires: expires,
    });

    const savedUser = await this.usersRepository.save(newUser);
    delete savedUser.password;

    return savedUser;
  }

  // ── 2. GİRİŞ YAP ──
  /** identifier: e-posta ("@" iceriyorsa) ya da kullanici adi. */
  async login(identifier: string, pass: string): Promise<User | null> {
    const value = identifier.trim();
    // E-postalar kucuk harfle aranir; kullanici adi aynen eslesir.
    const isEmail = value.includes('@');
    // Sifre ve dogrulama kodu select: false; giris icin acikca istenir.
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.password',
        'user.emailVerificationToken',
        'user.emailVerificationExpires',
      ])
      .where(
        isEmail ? 'LOWER(user.email) = :value' : 'user.username = :value',
        { value: isEmail ? value.toLowerCase() : value },
      )
      .getOne();

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      delete user.password;
      return user;
    }
    return null;
  }

  /**
   * Google ile girişte hesabı bulur ya da açar.
   * - googleId eşleşirse o hesap.
   * - Aynı e-postalı hesap varsa Google'a bağlanır ve doğrulanmış sayılır. Hesap daha önce
   *   doğrulanmamışsa (e-postanın sahibi olmayan biri açmış olabilir) şifresi silinir.
   * - Yoksa e-postadan türetilen benzersiz kullanıcı adıyla yeni hesap açılır.
   */
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
  }): Promise<User> {
    const linked = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.googleId = :googleId', { googleId: profile.googleId })
      .getOne();
    if (linked) return linked;

    const existing = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: profile.email })
      .getOne();
    if (existing) {
      await this.usersRepository.update(existing.id, {
        googleId: profile.googleId,
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        codeAttempts: 0,
        ...(existing.isEmailVerified
          ? {}
          : {
              password: null as unknown as string,
              resetPasswordToken: null,
              resetPasswordExpires: null,
            }),
      });
      return (await this.findById(existing.id))!;
    }

    const newUser = this.usersRepository.create({
      username: await this.uniqueUsernameFrom(profile.email),
      fullName: profile.fullName.slice(0, 80),
      email: profile.email,
      googleId: profile.googleId,
      isEmailVerified: true,
      emailVerificationToken: null,
    });
    const saved = await this.usersRepository.save(newUser);
    return (await this.findById(saved.id))!;
  }

  /** E-postanın @ öncesinden kurallara uyan (harf, rakam, _) ve boşta olan bir kullanıcı adı üretir. */
  private async uniqueUsernameFrom(email: string): Promise<string> {
    const base =
      email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 24) || 'kullanici';
    let candidate = base;
    for (let attempt = 0; attempt < 20; attempt++) {
      const taken = await this.usersRepository.findOne({
        where: { username: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
      candidate = `${base}_${randomInt(1000, 10000)}`;
    }
    return `${base}_${Date.now().toString(36)}`;
  }

  /**
   * Hesabı ve kişisel verilerini kalıcı olarak siler.
   * Onay: kullanıcı adının aynısı + (şifresi olan hesapta) mevcut şifre.
   * Bağlı kayıtlar veritabanı kurallarıyla temizlenir: oturumlar, dersler, görevler,
   * arkadaşlıklar, engeller, şikayetler, lig sonuçları ve özel mesajlar silinir;
   * oda sohbetindeki mesajlar kalır ama yazarı boşalır, sahibi olduğu odaların sahibi boşalır.
   */
  async deleteAccount(
    userId: number,
    confirmation: string,
    password?: string,
  ): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    if (confirmation.trim() !== user.username) {
      throw new BadRequestException(
        'Onay için kullanıcı adını aynen yazmalısın.',
      );
    }
    if (user.password) {
      if (!password || !(await bcrypt.compare(password, user.password))) {
        throw new BadRequestException('Şifre hatalı.');
      }
    }

    await this.purgeAccount(userId);
    // Avatar dosyası depodan UsersController'da silinir (StorageService).
  }

  /**
   * Hesabı ve bağlı kayıtları onay sormadan siler. Kullanıcının kendi silmesi
   * (`deleteAccount`) ve yönetici silmesi bunu kullanır; onay çağıranın işidir.
   * Verilen `manager` ile çağıranın transaction'ına katılır.
   */
  async purgeAccount(userId: number, manager?: EntityManager): Promise<void> {
    const run = async (m: EntityManager) => {
      // Eski veritabanlarında DM kısıtlaması CASCADE değilse silme takılmasın diye önce açıkça silinir.
      await m
        .createQueryBuilder()
        .delete()
        .from('direct_messages')
        .where('"senderId" = :id OR "receiverId" = :id', { id: userId })
        .execute();
      await m.delete(User, { id: userId });
    };
    if (manager) return run(manager);
    await this.usersRepository.manager.transaction(run);
  }

  async markEmailAsVerified(userId: number) {
    await this.usersRepository.update(userId, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      codeAttempts: 0,
    });
  }

  /** Yeni dogrulama kodu yazar; kod `VERIFICATION_CODE_TTL_MS` boyunca gecerlidir. */
  async updateVerificationToken(userId: number, token: string) {
    await this.usersRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      codeAttempts: 0,
    });
  }

  /**
   * Yanlis kod denemesini sayar. Sayac veritabaninda tek ifadeyle artar; paralel istekler
   * sayaci atlatamaz. Sinira ulasilinca bekleyen kodlar gecersiz olur ve kullanici yeni
   * kod istemek zorunda kalir. Kod gecersizlestiyse true doner.
   */
  async registerFailedCodeAttempt(userId: number): Promise<boolean> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ codeAttempts: () => '"codeAttempts" + 1' })
      .where('id = :id', { id: userId })
      .returning('"codeAttempts"')
      .execute();
    const rows = result.raw as Array<{ codeAttempts: number }> | undefined;
    const attempts = Number(rows?.[0]?.codeAttempts ?? 0);
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await this.usersRepository.update(userId, {
        emailVerificationToken: null,
        emailVerificationExpires: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        codeAttempts: 0,
      });
      return true;
    }
    return false;
  }

  // ── KULLANICI BUL (JWT İÇİN) ──
  async findById(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      delete user.password;
      user.badges = this.getVisibleBadges(user);
    }
    return user;
  }

  private stripPassword(user: User): User {
    delete user.password;
    user.badges = this.getVisibleBadges(user);
    return user;
  }

  private normalizeBadges(badges?: string[] | null): string[] {
    // Katalogda olmayan (kaldirilmis) rozet adlari sessizce yok sayilir.
    return (Array.isArray(badges) ? badges : []).filter(
      (badge) => typeof badge === 'string' && KNOWN_BADGES.has(badge),
    );
  }

  private getVisibleBadges(user: User): string[] {
    const badges = this.normalizeBadges(user.badges);
    if (
      (user.totalFocusMinutes || 0) >= 120 &&
      !badges.includes(BADGE_NAMES.marathon)
    ) {
      badges.push(BADGE_NAMES.marathon);
    }
    return badges;
  }

  // ── KULLANICI BUL (E-POSTA İLE) ──
  async findIdByUsername(username: string): Promise<number | null> {
    const user = await this.usersRepository.findOne({
      where: { username },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  /**
   * E-posta dogrulama ve sifre sifirlama kontrolu icin gizli alanlarla getirir.
   * Sonucu istemciye dondurme.
   */
  async findByEmailWithSecrets(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.emailVerificationToken',
        'user.emailVerificationExpires',
        'user.resetPasswordToken',
        'user.resetPasswordExpires',
        'user.codeAttempts',
      ])
      .where('LOWER(user.email) = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  // ── ŞİFRE SIFIRLAMA TOKEN GÜNCELLE ──
  async updateResetToken(userId: number, token: string, expiry: Date) {
    await this.usersRepository.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expiry,
      codeAttempts: 0,
    });
  }

  // ── ŞİFRE GÜNCELLE ──
  /** Sifreyi degistirir ve eski token'lari gecersiz kilar (tokenVersion + 1). */
  async updatePassword(userId: number, hashedPass: string) {
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        password: hashedPass,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        codeAttempts: 0,
        tokenVersion: () => '"tokenVersion" + 1',
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  /** Odul gibi coin eklemeleri; tek ifadeyle (coins = coins + n) oldugu icin yarisa girmez. */
  async addCoins(userId: number, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    await this.usersRepository.increment(
      { id: userId },
      'coins',
      Math.floor(amount),
    );
  }

  // ── 3. ODAKLANMA PUANI VE OYUNLAŞTIRMA (AŞAMA 3) ──
  async addFocusTime(userId: number, rawMinutes: number) {
    // Kesirli dakika sayilmaz (30 sn = 1 dk olmasin).
    const minutes = Math.floor(rawMinutes);
    if (!Number.isFinite(minutes) || minutes < 1) return null;

    // Satir kilidi: ayni anda yapilan magaza alisverisi ya da baska odul bu yazimi ezemez.
    const progress = await this.usersRepository.manager.transaction(
      async (em) => {
        const user = await em.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user) return null;
        return this.applyFocusTime(em, user, minutes);
      },
    );
    if (!progress) return null;
    const { user, todayString, currentHour, newBadges } = progress;

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
    // Bu oturumda yeni kazanılan rozetler (kaydedilmez; çağıran bildirmek için kullanır).
    return Object.assign(user, { newBadges });
  }

  /** Kilitli kullanici satirina odak suresini, seriyi, coin'i ve rozetleri yazar. */
  private async applyFocusTime(em: EntityManager, user: User, minutes: number) {
    user.totalFocusMinutes = (user.totalFocusMinutes || 0) + minutes;

    // SERİ: günler Türkiye saatine göre sayılır; dün çalıştıysa seri sürer, bir gün atlanırsa sıfırlanır.
    const now = new Date();
    const todayString = localDayKey(now);
    const currentHour = localHour(now);

    let streakMultiplier = 0;
    if (user.lastFocusDate) {
      const gap = daysBetweenKeys(
        localDayKey(user.lastFocusDate),
        todayString,
      );
      if (gap >= 1) {
        // Arada bos gun varsa seri koruma harcanir (bkz. streak.ts).
        const next = advanceStreak(
          user.currentStreak || 0,
          gap,
          user.streakFreezes || 0,
        );
        user.currentStreak = next.streak;
        user.streakFreezes = (user.streakFreezes || 0) - next.freezesUsed;
        user.lastFocusDate = now;
      }
    } else {
      user.currentStreak = 1;
      user.lastFocusDate = now;
    }
    if (user.currentStreak > user.bestStreak)
      user.bestStreak = user.currentStreak;

    // COIN HESAPLAMASI (Örn: Streak başına %10 bonus, max %50)
    streakMultiplier = Math.min(user.currentStreak, 5) * 0.1;
    const earnedCoins = Math.floor(minutes * (1 + streakMultiplier));
    user.coins = (user.coins || 0) + earnedCoins;

    // ROZETLER (kurallar badges.ts'de)
    user.badges = this.normalizeBadges(user.badges);
    const newBadges: string[] = [];
    for (const badge of focusBadges({
      totalFocusMinutes: user.totalFocusMinutes,
      currentStreak: user.currentStreak,
      sessionMinutes: minutes,
      endHour: currentHour,
    })) {
      if (!user.badges.includes(badge)) {
        user.badges.push(badge);
        newBadges.push(badge);
      }
    }

    await em.save(user);
    return { user, todayString, currentHour, newBadges };
  }

  // YENİ: HAFTALIK ANALİTİK VERİSİ
  async getWeeklyAnalytics(userId: number) {
    // Son 7 günün verilerini getir
    const today = new Date();
    const pastWeek = new Date(today);
    pastWeek.setDate(pastWeek.getDate() - 6); // Son 7 gün (bugün dahil)

    const dateString = localDayKey(pastWeek);

    const records = await this.dailyAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.date >= :dateString', { dateString })
      .orderBy('analytics.date', 'ASC')
      .getMany();

    return records;
  }

  /** Odak dışı olaylarla kazanılan rozeti (hedef, lig) ekler. Yeni kazanıldıysa true. */
  async awardBadge(userId: number, badge: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true, badges: true },
    });
    if (!user || !KNOWN_BADGES.has(badge)) return false;
    const badges = this.normalizeBadges(user.badges);
    if (badges.includes(badge)) return false;
    badges.push(badge);
    await this.usersRepository.update(userId, { badges });
    return true;
  }

  getBadgeCatalog() {
    return BADGES;
  }

  /** Kullanıcı adı ya da ad soyadla arama (en az 2 karakter). Askıdakiler ve `excludeIds` hariç. */
  async searchUsers(query: string, excludeIds: number[]) {
    // LIKE joker karakterleri (% _ \) aramada düz metin sayılsın diye atılır.
    const term = query.trim().replace(/[%_\\]/g, '');
    if (term.length < 2) return [];
    const builder = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.fullName',
        'user.avatarUrl',
        'user.equippedProfileFrame',
        'user.isPremium',
        'user.isOnline',
        'user.totalFocusMinutes',
      ])
      .where('(user.username ILIKE :prefix OR user.fullName ILIKE :anywhere)', {
        prefix: `${term}%`,
        anywhere: `%${term}%`,
      })
      .andWhere('user.bannedAt IS NULL')
      .orderBy('user.username', 'ASC')
      .take(20);
    if (excludeIds.length)
      builder.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
    return builder.getMany();
  }

  /** Başkalarının görebileceği profil (e-posta yok). Bu haftanın dakikası da eklenir. */
  async getPublicProfile(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        equippedProfileFrame: true,
        equippedProfileCover: true,
        equippedIcon: true,
        isPremium: true,
        isOnline: true,
        currentRoom: true,
        totalFocusMinutes: true,
        currentStreak: true,
        bestStreak: true,
        badges: true,
        bannedAt: true,
      },
    });
    if (!user || user.bannedAt) return null;
    const weekStart = localWeekStartKey(new Date());
    const week = await this.dailyAnalyticsRepository
      .createQueryBuilder('day')
      .select('COALESCE(SUM(day.focusMinutes), 0)', 'minutes')
      .where('day.userId = :id', { id })
      .andWhere('day.date BETWEEN :start AND :end', {
        start: weekStart,
        end: addDaysToKey(weekStart, 6),
      })
      .getRawOne<{ minutes: string }>();
    const publicUser: Partial<User> = { ...user };
    delete publicUser.bannedAt;
    return {
      ...publicUser,
      badges: this.getVisibleBadges(user),
      weekMinutes: Number(week?.minutes ?? 0),
    };
  }

  /** İki kişi arasındaki arkadaşlık durumu (profil sayfasındaki düğme için). */
  async friendshipStatus(me: number, other: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { sender: { id: me }, receiver: { id: other } },
        { sender: { id: other }, receiver: { id: me } },
      ],
      relations: { sender: true },
      select: { id: true, status: true, sender: { id: true } },
    });
    if (!friendship || friendship.status === 'rejected')
      return { status: 'none' as const, requestId: null };
    if (friendship.status === 'accepted')
      return { status: 'friends' as const, requestId: null };
    return friendship.sender.id === me
      ? { status: 'outgoing' as const, requestId: null }
      : { status: 'incoming' as const, requestId: friendship.id };
  }

  // ── 4. TÜM KULLANICILAR ──
  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  // ── 5. LİDERLİK TABLOSU (Avatar Eklendi) ──
  async getLeaderboard(): Promise<User[]> {
    return this.usersRepository.find({
      where: { bannedAt: IsNull() },
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
        'equippedProfileFrame',
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
        equippedProfileFrame: currentUser.equippedProfileFrame,
        isOnline: currentUser.isOnline,
        currentRoom: currentUser.currentRoom,
      });
    }

    return friends.sort(
      (a, b) => (b.totalFocusMinutes || 0) - (a.totalFocusMinutes || 0),
    );
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
      relations: { sender: true },
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        throw new BadRequestException('Bu kişiyle zaten arkadaşsınız.');
      }
      if (existingRequest.status === 'pending') {
        throw new BadRequestException(
          existingRequest.sender.id === sender.id
            ? 'Bu kişiye zaten bir arkadaşlık isteği gönderdin.'
            : 'Bu kişi sana zaten istek göndermiş; gelen isteklerden kabul edebilirsin.',
        );
      }
      // Reddedilmiş istek yeniden gönderilebilir: kayıt bekleyene döner, yön gönderene göre güncellenir.
      existingRequest.status = 'pending';
      existingRequest.sender = sender;
      existingRequest.receiver = receiver;
      return this.friendshipRepository.save(existingRequest);
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
        sender: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          equippedProfileFrame: true,
        },
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
      relations: { sender: true, receiver: true },
    });

    if (!request) {
      throw new NotFoundException(
        'Böyle bir istek bulunamadı veya zaten yanıtlanmış.',
      );
    }

    request.status = status;
    return this.friendshipRepository.save(request);
  }

  /** İki kullanıcı arkadaş mı (kabul edilmiş kayıt var mı)? */
  async areFriends(a: number, b: number): Promise<boolean> {
    if (a === b) return false;
    const found = await this.friendshipRepository.findOne({
      where: [
        { sender: { id: a }, receiver: { id: b }, status: 'accepted' },
        { sender: { id: b }, receiver: { id: a }, status: 'accepted' },
      ],
      select: { id: true },
    });
    return !!found;
  }

  /** Arkadaşlıktan çıkarır (iki yönlü). Arkadaş değillerse 404. */
  async removeFriend(userId: number, friendId: number): Promise<void> {
    const found = await this.friendshipRepository.find({
      where: [
        { sender: { id: userId }, receiver: { id: friendId }, status: 'accepted' },
        { sender: { id: friendId }, receiver: { id: userId }, status: 'accepted' },
      ],
      select: { id: true },
    });
    if (found.length === 0) {
      throw new NotFoundException('Bu kişi arkadaş listende değil.');
    }
    await this.friendshipRepository.delete(found.map((f) => f.id));
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
        equippedProfileFrame: friend.equippedProfileFrame,
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

  /** Hesapta şifre var mı (Google ile açılmış hesapta yok)? Hash'in kendisi dönmez. */
  async hasPassword(userId: number): Promise<boolean> {
    const row = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.id')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();
    return !!row?.password;
  }

  /**
   * Hesap ayarlarını günceller. Şifresi olan hesapta e-posta, kullanıcı adı ya da şifre
   * değişirken mevcut şifre HER ZAMAN doğrulanır. Yalnızca Google ile açılmış hesap
   * (şifresiz) ad ve kullanıcı adını değiştirebilir; e-postası ve şifresi değiştirilemez.
   * E-posta değişirse doğrulama sıfırlanır ve yeni adres için kod üretilir.
   */
  async updateAccountSettings(
    userId: number,
    settings: UpdateAccountSettingsDto,
  ): Promise<AccountSettingsResult> {
    // Mevcut sifre kontrolu icin sifre ozeti acikca secilir.
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const newEmail = settings.email?.trim().toLowerCase();
    const emailChanged = !!newEmail && newEmail !== user.email.toLowerCase();
    const usernameChanged =
      !!settings.username && settings.username !== user.username;
    const passwordChanged = !!settings.newPassword;
    const hasPassword = !!user.password;

    if (!hasPassword && emailChanged) {
      throw new BadRequestException(
        'Google ile açılmış hesabın e-postası değiştirilemez.',
      );
    }
    if (!hasPassword && passwordChanged) {
      throw new BadRequestException(
        'Google ile açılmış hesapta şifre belirlenemez.',
      );
    }
    if (hasPassword && (emailChanged || usernameChanged || passwordChanged)) {
      if (
        !settings.currentPassword ||
        !(await bcrypt.compare(settings.currentPassword, user.password!))
      ) {
        throw new BadRequestException('Mevcut şifre hatalı.');
      }
    }

    const changes: QueryDeepPartialEntity<User> = {};
    if (usernameChanged) {
      const existingUsername = await this.usersRepository.findOne({
        where: { username: settings.username },
      });
      if (existingUsername && existingUsername.id !== userId) {
        throw new BadRequestException('Bu kullanıcı adı zaten kullanılıyor.');
      }
      changes.username = settings.username;
    }
    if (settings.fullName && settings.fullName !== user.fullName) {
      changes.fullName = settings.fullName;
    }

    let verificationCode: string | null = null;
    if (emailChanged) {
      const existingEmail = await this.findByEmailInsensitive(newEmail);
      if (existingEmail && existingEmail.id !== userId) {
        throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
      }
      verificationCode = generateVerificationCode();
      changes.email = newEmail;
      changes.isEmailVerified = false;
      changes.emailVerificationToken = verificationCode;
      changes.emailVerificationExpires = new Date(
        Date.now() + VERIFICATION_CODE_TTL_MS,
      );
      changes.codeAttempts = 0;
    }
    if (passwordChanged) {
      changes.password = await bcrypt.hash(settings.newPassword!, 10);
      // Eski token'lar (diğer cihazlar) geçersiz olur; yanıttaki yeni token geçerlidir.
      changes.tokenVersion = () => '"tokenVersion" + 1';
    }

    if (Object.keys(changes).length > 0) {
      try {
        await this.usersRepository
          .createQueryBuilder()
          .update(User)
          .set(changes)
          .where('id = :id', { id: userId })
          .execute();
      } catch (e) {
        // Es zamanli istekte benzersiz kisit devreye girer.
        if ((e as { code?: string }).code === '23505') {
          throw new BadRequestException(
            'Bu kullanıcı adı ya da e-posta zaten kullanılıyor.',
          );
        }
        throw e;
      }
    }

    // Yanit /users/me ile ayni acik alanlari tasir; gizli (select: false) alanlar yuklenmez.
    const updated = await this.findById(userId);
    if (!updated) throw new NotFoundException('Kullanıcı bulunamadı');
    return {
      user: Object.assign(updated, { hasPassword }),
      emailChanged,
      passwordChanged,
      verificationCode,
    };
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

    // Push token select: false oldugu icin iliskiyle gelmez; ayrica secilir.
    const friendIds = friendships.map((f) =>
      f.sender.id === userId ? f.receiver.id : f.sender.id,
    );
    return this.getUserPushTokens(friendIds);
  }

  // ── 14. BELİRLİ KULLANICILARIN PUSH TOKENLARINI GETİR (NUDGE İÇİN) ──
  async getUserPushTokens(userIds: number[]): Promise<string[]> {
    if (!userIds.length) return [];
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.expoPushToken')
      .where('user.id IN (:...ids)', { ids: userIds })
      .andWhere('user.expoPushToken IS NOT NULL')
      .getMany();

    return users.map((u) => u.expoPushToken).filter((t): t is string => !!t);
  }

  // ── 15. KULLANICI ONLINE DURUMU VE ODASI ──
  async setOnlineStatus(
    userId: number,
    isOnline: boolean,
    roomName?: string | null,
  ) {
    await this.usersRepository.update(userId, {
      isOnline,
      currentRoom: roomName || null,
    });
  }

  /** Kullanicinin son yazildigi an (surec icinde); her istekte veritabanina yazmamak icin. */
  private readonly lastSeenWrites = new Map<number, number>();

  /** Son gorulmeyi en fazla 5 dakikada bir yazar. Hata istegi bozmaz. */
  async touchLastSeen(userId: number): Promise<void> {
    const now = Date.now();
    const last = this.lastSeenWrites.get(userId);
    if (last !== undefined && now - last < 5 * 60_000) return;
    this.lastSeenWrites.set(userId, now);
    try {
      await this.usersRepository.update(userId, { lastSeenAt: new Date(now) });
    } catch {
      this.lastSeenWrites.delete(userId);
    }
  }

  async getRoomMemberCounts(roomNames: string[]): Promise<Map<string, number>> {
    if (roomNames.length === 0) {
      return new Map();
    }

    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.currentRoom', 'roomName')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.isOnline = :isOnline', { isOnline: true })
      .andWhere('user.currentRoom IN (:...roomNames)', { roomNames })
      .groupBy('user.currentRoom')
      .getRawMany<{ roomName: string; count: string }>();

    return new Map(rows.map((row) => [row.roomName, Number(row.count)]));
  }

  // ── AŞAMA 3: MAĞAZA İŞLEMLERİ ──
  /**
   * Satın alma: kullanıcı satırı kilitlenir, bakiye ve sahiplik kontrol edilir, düşüm
   * `coins >= fiyat` koşullu tek UPDATE ile yapılır. Aynı anda gelen istekler sırayla işlenir;
   * ödenebilenden fazlası başarılı olmaz.
   */
  async buyItem(userId: number, itemType: ShopItemType, itemId: string) {
    const item = findShopItem(itemType, itemId);
    if (!item) throw new BadRequestException('Mağazada böyle bir ürün yok');
    const price = item.price;

    return this.usersRepository.manager.transaction(async (em) => {
      const user = await em.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

      if ((user.coins || 0) < price) {
        throw new BadRequestException('Yetersiz Odak Puanı (Coin)');
      }

      const changes: QueryDeepPartialEntity<User> = {};
      if (itemType === 'streakFreeze') {
        if ((user.streakFreezes || 0) >= MAX_STREAK_FREEZES)
          throw new BadRequestException(
            `En fazla ${MAX_STREAK_FREEZES} seri koruma tutabilirsin`,
          );
        changes.streakFreezes = (user.streakFreezes || 0) + 1;
      } else {
        const owned = ownedList(user, itemType);
        if (owned.includes(itemId))
          throw new BadRequestException('Bu ürüne zaten sahipsiniz');
        owned.push(itemId);
        changes[ownedColumn(itemType)] = owned;
      }

      const result = await em
        .createQueryBuilder()
        .update(User)
        .set({ ...changes, coins: () => '"coins" - :price' })
        .where('id = :id AND "coins" >= :price', { id: userId, price })
        .execute();
      if (result.affected !== 1) {
        throw new BadRequestException('Yetersiz Odak Puanı (Coin)');
      }

      const fresh = await em.findOne(User, { where: { id: userId } });
      if (!fresh) throw new NotFoundException('Kullanıcı bulunamadı');
      return this.stripPassword(fresh);
    });
  }

  getShopCatalog() {
    return SHOP_CATALOG;
  }

  async equipItem(userId: number, itemType: ShopItemType, itemId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    if (itemType === 'streakFreeze') {
      throw new BadRequestException('Seri koruma kuşanılmaz; kendiliğinden kullanılır');
    }
    // Ücretsiz ürünler herkese açıktır; diğerleri satın alınmış olmalı.
    const item = findShopItem(itemType, itemId);
    if (!item) throw new BadRequestException('Mağazada böyle bir ürün yok');
    if (item.price > 0 && !ownedList(user, itemType).includes(itemId)) {
      throw new BadRequestException('Bu ürüne sahip değilsiniz');
    }
    // Yalnızca kuşanılan sütun yazılır; tüm satırı kaydetmek eşzamanlı coin değişimini ezerdi.
    const equipped: Partial<User> = {};
    setEquipped(equipped, itemType, itemId);
    await this.usersRepository.update(userId, equipped);
    setEquipped(user, itemType, itemId);
    return this.stripPassword(user);
  }}

/** Kullanıcının bu türde sahip olduğu ürünler (dizi yerinde değiştirilebilir). */
function ownedList(user: User, type: ShopItemType): string[] {
  switch (type) {
    case 'color':
      return (user.ownedColors = user.ownedColors || []);
    case 'icon':
      return (user.ownedIcons = user.ownedIcons || []);
    case 'soundPack':
      return (user.ownedSoundPacks = user.ownedSoundPacks || ['classic']);
    case 'profileCover':
      return (user.ownedProfileCovers = user.ownedProfileCovers || ['none']);
    case 'lampColor':
      return (user.ownedLampColors = user.ownedLampColors || ['classic']);
    default:
      return (user.ownedProfileFrames = user.ownedProfileFrames || ['none']);
  }
}

/** Satın alınan ürünün sahiplik sütunu. */
function ownedColumn(type: ShopItemType) {
  switch (type) {
    case 'color':
      return 'ownedColors';
    case 'icon':
      return 'ownedIcons';
    case 'soundPack':
      return 'ownedSoundPacks';
    case 'profileCover':
      return 'ownedProfileCovers';
    case 'lampColor':
      return 'ownedLampColors';
    default:
      return 'ownedProfileFrames';
  }
}

function setEquipped(user: Partial<User>, type: ShopItemType, id: string) {
  switch (type) {
    case 'color':
      user.equippedBubbleColor = id;
      break;
    case 'icon':
      user.equippedIcon = id;
      break;
    case 'soundPack':
      user.equippedSoundPack = id;
      break;
    case 'profileCover':
      user.equippedProfileCover = id;
      break;
    case 'lampColor':
      user.equippedLampColor = id;
      break;
    default:
      user.equippedProfileFrame = id;
  }
}
