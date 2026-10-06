/**
 * Demo verisi: `npm run seed`
 *
 * Sunum ve uçtan uca testler için dört doğrulanmış kullanıcı, odalar, arkadaşlıklar,
 * son 14 günün odak geçmişi, dersler, görevler ve bir planlı oturum oluşturur.
 * Yalnızca kendi kayıtlarını (e-postası @demo.studylounge ile bitenler ve adı "Demo:"
 * ile başlayan odalar) silip yeniden yazar; başka veriye dokunmaz. Tekrar çalıştırmak güvenlidir.
 *
 * Şema hazır olmalı: backend'i bir kez geliştirme modunda başlat ya da migration'ları çalıştır.
 * Üretim veritabanında yalnızca SEED_ALLOW_PRODUCTION=true ile çalışır.
 */
import * as bcrypt from 'bcrypt';
import { In, Like } from 'typeorm';
import dataSource from './data-source';
import { addDaysToKey, localDayKey } from './config/time';
import { LobbyAccess } from './lobbies/lobby-access.entity';
import { Lobby } from './lobbies/lobby.entity';
import { ScheduledSession, ScheduledSessionInvite } from './study/scheduled-session.entity';
import { StudySession } from './study/study-session.entity';
import { Subject } from './study/subject.entity';
import { Task } from './study/task.entity';
import { DailyAnalytics } from './users/daily-analytics.entity';
import { Friendship } from './users/friendship.entity';
import { User } from './users/user.entity';

export const DEMO_EMAIL_DOMAIN = 'demo.studylounge';
export const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo12345!';
const LOBBY_PREFIX = 'Demo: ';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Her çalıştırmada aynı "rastgele" sayılar (sunum verisi tutarlı kalsın). */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const DEMO_USERS = [
  { key: 'admin', username: 'demo_admin', fullName: 'Deniz Yılmaz', role: 'admin', isPremium: true, coins: 420, frame: 'gold' },
  { key: 'elif', username: 'demo_elif', fullName: 'Elif Kaya', role: 'user', isPremium: true, coins: 860, frame: 'emerald' },
  { key: 'ali', username: 'demo_ali', fullName: 'Ali Demir', role: 'user', isPremium: false, coins: 140, frame: 'none' },
  { key: 'zeynep', username: 'demo_zeynep', fullName: 'Zeynep Ak', role: 'user', isPremium: false, coins: 260, frame: 'ruby' },
] as const;

type DemoKey = (typeof DEMO_USERS)[number]['key'];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Üretim veritabanına demo verisi yazılmaz. Gerçekten istiyorsan SEED_ALLOW_PRODUCTION=true ver.');
  }

  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const lobbies = dataSource.getRepository(Lobby);

  // 1. Eski demo kayıtlarını temizle (ilişkili kayıtlar CASCADE ile gider).
  const oldUsers = await users.find({ where: { email: Like(`%@${DEMO_EMAIL_DOMAIN}`) }, select: { id: true } });
  await lobbies.delete({ name: Like(`${LOBBY_PREFIX}%`) });
  if (oldUsers.length) await users.delete({ id: In(oldUsers.map((user) => user.id)) });

  // 2. Kullanıcılar
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const created = {} as Record<DemoKey, User>;
  for (const demo of DEMO_USERS) {
    created[demo.key] = await users.save(
      users.create({
        username: demo.username,
        fullName: demo.fullName,
        email: `${demo.username}@${DEMO_EMAIL_DOMAIN}`,
        password: passwordHash,
        isEmailVerified: true,
        isPremium: demo.isPremium,
        role: demo.role,
        coins: demo.coins,
        ownedProfileFrames: ['none', demo.frame],
        equippedProfileFrame: demo.frame,
        dailyGoalMinutes: demo.key === 'elif' ? 120 : 0,
        weeklyGoalMinutes: demo.key === 'elif' ? 720 : 0,
      }),
    );
  }

  // 3. Arkadaşlıklar: Elif herkesle arkadaş, Ali'nin Deniz'e bekleyen isteği var.
  const friendships = dataSource.getRepository(Friendship);
  await friendships.save([
    friendships.create({ sender: created.elif, receiver: created.ali, status: 'accepted' }),
    friendships.create({ sender: created.zeynep, receiver: created.elif, status: 'accepted' }),
    friendships.create({ sender: created.admin, receiver: created.elif, status: 'accepted' }),
    friendships.create({ sender: created.ali, receiver: created.admin, status: 'pending' }),
  ]);

  // 4. Odalar (24 saat açık kalır; seed her çalıştığında yenilenir)
  const privateLobby = await lobbies.save([
    lobbies.create({ name: `${LOBBY_PREFIX}Sessiz Kütüphane`, icon: 'book', category: 'Genel', description: 'Konuşmadan çalışılan oda. Molada sohbet serbest.', maxUsers: 50, owner: created.admin }),
    lobbies.create({ name: `${LOBBY_PREFIX}Yazılım Final Haftası`, icon: 'video', category: 'Bilgisayar Bilimi', description: 'Kamerayı açıp birlikte algoritma çalışıyoruz.', maxUsers: 6, allowVideo: true, owner: created.elif }),
    lobbies.create({ name: `${LOBBY_PREFIX}Tıp Sınav Grubu`, icon: 'lock', category: 'Tıp & Sağlık', description: 'Şifre: demo123', maxUsers: 5, isPrivate: true, passwordHash: await bcrypt.hash('demo123', 10), owner: created.elif }),
  ]).then((saved) => saved[2]);
  await dataSource.getRepository(LobbyAccess).save({ lobby: privateLobby, user: created.zeynep });

  // 5. Elif'in dersleri, son 14 günün odak geçmişi ve oturumları
  const subjects = dataSource.getRepository(Subject);
  const elifSubjects = await subjects.save([
    subjects.create({ user: created.elif, name: 'Fizik 2', color: 'blue' }),
    subjects.create({ user: created.elif, name: 'Algoritmalar', color: 'orange' }),
    subjects.create({ user: created.elif, name: 'İngilizce', color: 'aqua' }),
  ]);

  const random = seededRandom(42);
  const today = localDayKey(new Date());
  const daily = dataSource.getRepository(DailyAnalytics);
  const sessions = dataSource.getRepository(StudySession);
  const dailyRows: DailyAnalytics[] = [];
  const sessionRows: StudySession[] = [];

  for (const demo of DEMO_USERS) {
    const user = created[demo.key];
    const intensity = { admin: 0.6, elif: 1.3, ali: 0.8, zeynep: 1 }[demo.key];
    for (let offset = 13; offset >= 0; offset -= 1) {
      // Bazı günler boş kalsın; son iki gün herkes çalışmış olsun (seri görünsün).
      if (offset > 1 && random() < 0.25) continue;
      const date = addDaysToKey(today, -offset);
      const hourly = Array<number>(24).fill(0);
      let total = 0;
      const blocks = 1 + Math.floor(random() * 3);
      for (let block = 0; block < blocks; block += 1) {
        const minutes = Math.round((25 + random() * 65) * intensity);
        const hour = [9, 10, 14, 15, 16, 20, 21][Math.floor(random() * 7)];
        hourly[hour] += minutes;
        total += minutes;
        if (demo.key === 'elif') {
          // Türkiye saati: yerel saat - 3 = UTC
          const startedAt = new Date(`${date}T${String(hour - 3).padStart(2, '0')}:${String(Math.floor(random() * 40)).padStart(2, '0')}:00Z`);
          sessionRows.push(
            sessions.create({
              user,
              subject: elifSubjects[Math.floor(random() * elifSubjects.length)],
              roomName: `${LOBBY_PREFIX}Sessiz Kütüphane`,
              startedAt,
              endedAt: new Date(startedAt.getTime() + minutes * 60_000),
              minutes,
              creditedMinutes: minutes,
              source: random() < 0.7 ? 'web' : 'mobile',
            }),
          );
        }
      }
      dailyRows.push(daily.create({ user, date, focusMinutes: total, hourlyDistribution: hourly, goalRewarded: demo.key === 'elif' && total >= 120 }));
    }
  }
  await daily.save(dailyRows);
  await sessions.save(sessionRows);

  // Toplamlar, seri ve rozetler geçmişle tutarlı olsun.
  for (const demo of DEMO_USERS) {
    const rows = dailyRows.filter((row) => row.user.id === created[demo.key].id);
    const totalFocusMinutes = rows.reduce((sum, row) => sum + row.focusMinutes, 0);
    let streak = 0;
    for (let offset = 0; rows.some((row) => row.date === addDaysToKey(today, -offset)); offset += 1) streak += 1;
    const badges = ['İlk Adım', ...(totalFocusMinutes >= 120 ? ['Maratoncu'] : []), ...(streak >= 7 ? ['Haftalık Seri'] : [])];
    await users.update(created[demo.key].id, {
      totalFocusMinutes,
      currentStreak: streak,
      bestStreak: Math.max(streak, 5),
      lastFocusDate: new Date(),
      badges,
    });
  }

  // 6. Görevler ve planlı oturum
  const tasks = dataSource.getRepository(Task);
  await tasks.save([
    tasks.create({ user: created.elif, title: 'Dalga denklemi sorularını bitir', subject: elifSubjects[0], current: true }),
    tasks.create({ user: created.elif, title: 'Dijkstra uygulamasını yaz', subject: elifSubjects[1] }),
    tasks.create({ user: created.elif, title: '20 yeni kelime tekrarı', subject: elifSubjects[2] }),
    tasks.create({ user: created.elif, title: 'Lab raporunu teslim et', subject: elifSubjects[0], done: true, doneAt: new Date(Date.now() - DAY_MS) }),
  ]);

  const plans = dataSource.getRepository(ScheduledSession);
  const tomorrowEvening = new Date(`${addDaysToKey(today, 1)}T17:00:00Z`); // 20:00 TR
  const plan = await plans.save(plans.create({ owner: created.elif, title: 'Final öncesi tekrar', startsAt: tomorrowEvening, durationMinutes: 90 }));
  const invites = dataSource.getRepository(ScheduledSessionInvite);
  await invites.save([
    invites.create({ session: plan, user: created.zeynep, status: 'accepted' }),
    invites.create({ session: plan, user: created.ali, status: 'pending' }),
  ]);

  await dataSource.destroy();

  console.log('Demo verisi hazır. Tüm hesapların şifresi:', DEMO_PASSWORD);
  for (const demo of DEMO_USERS) {
    console.log(`  ${demo.fullName.padEnd(14)} ${demo.username}@${DEMO_EMAIL_DOMAIN}${demo.role === 'admin' ? '  (yönetici)' : ''}${demo.isPremium ? '  (Premium)' : ''}`);
  }
  console.log(`Şifreli oda "${LOBBY_PREFIX}Tıp Sınav Grubu" şifresi: demo123`);
}

main().catch(async (error: unknown) => {
  console.error('Seed başarısız:', error instanceof Error ? error.message : error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
