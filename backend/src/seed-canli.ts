/**
 * Yerelde sayfaları dolu görmek için: `npm run seed:canli`
 *
 * Birçok oda (herkese açık, kameralı, Elite, şifreli), odalarda çalışan sahte kullanıcılar
 * (bir kısmı odakta, lambaları yanar), haftalık sıralama için odak geçmişi ve rozetler yazar.
 * `SEED_ME_EMAIL=senin@epostan` verirsen sahte kullanıcıların çoğu seninle arkadaş olur
 * (Arkadaşlar sayfası dolar, birkaçı "odada" görünür; ikisi bekleyen istek gönderir).
 *
 * Yalnızca kendi kayıtlarını (e-postası canli_*@demo.studylounge olanlar ve aşağıdaki oda adları)
 * silip yeniden yazar. `npm run seed` bu kullanıcıları ve odaları zaten temizler.
 * Kullanıcılar çevrim içi görünür; backend'in bağlantı kesme mantığı onları kapatabilir,
 * bu yüzden sayfaları denerken backend açıkken betiği yeniden çalıştırmak yeterlidir.
 * Üretim veritabanında çalışmaz.
 */
import * as bcrypt from 'bcrypt';
import { In, Like } from 'typeorm';
import dataSource from './data-source';
import { addDaysToKey, localDayKey, localWeekStartKey } from './config/time';
import { Friendship } from './users/friendship.entity';
import { DailyAnalytics } from './users/daily-analytics.entity';
import { Lobby } from './lobbies/lobby.entity';
import { User } from './users/user.entity';

const DOMAIN = 'demo.studylounge';
const PASSWORD = process.env.SEED_PASSWORD || 'Demo12345!';
const P = 'Demo: ';

const FIRST = ['Ayşe', 'Burak', 'Cem', 'Defne', 'Emre', 'Fatma', 'Gökhan', 'Hande', 'İrem', 'Kaan', 'Leyla', 'Murat', 'Nehir', 'Onur', 'Pınar', 'Rüya', 'Sinan', 'Tuğçe', 'Umut', 'Yağmur'];
const LAST = ['Aydın', 'Bulut', 'Çınar', 'Doğan', 'Erdem', 'Gül', 'Kılıç', 'Özkan', 'Polat', 'Şahin'];
const FRAMES = ['none', 'gold', 'emerald', 'ruby'];

interface RoomSpec {
  name: string;
  icon: string;
  category: string;
  description: string;
  maxUsers?: number;
  allowVideo?: boolean;
  isPremiumOnly?: boolean;
  isPrivate?: boolean;
  /** Odaya yerleşecek sahte kullanıcı sayısı ve bunların kaçı odakta (lamba yanar). */
  people: number;
  focused: number;
}

const ROOMS: RoomSpec[] = [
  { name: `${P}Sabah Kuşları`, icon: 'users', category: 'Genel', description: 'Sabah 7 gibi başlayıp öğlene kadar çalışıyoruz.', people: 9, focused: 6 },
  { name: `${P}YKS Maratonu`, icon: 'users', category: 'Sınav Hazırlık', description: 'TYT-AYT tekrarı, deneme sonrası soru çözümü.', people: 14, focused: 9 },
  { name: `${P}Kodlama Atölyesi`, icon: 'video', category: 'Bilgisayar Bilimi', description: 'Kameralar açık, birlikte projelerimizi yazıyoruz.', maxUsers: 6, allowVideo: true, people: 5, focused: 4 },
  { name: `${P}Matematik Çalışma`, icon: 'video', category: 'Matematik', description: 'Ekran paylaşıp soru çözüyoruz.', maxUsers: 6, allowVideo: true, people: 3, focused: 1 },
  { name: `${P}Elite Odak Salonu`, icon: 'crown', category: 'Genel', description: 'Premium üyelere özel, odak süresi 2 kat sayılır.', isPremiumOnly: true, people: 6, focused: 5 },
  { name: `${P}Elite Tez Yazımı`, icon: 'crown', category: 'Akademik', description: 'Tez ve makale yazanlar için sessiz oda.', isPremiumOnly: true, people: 2, focused: 2 },
  { name: `${P}Hukuk Grubu`, icon: 'lock', category: 'Hukuk', description: 'Şifre: demo123', maxUsers: 5, isPrivate: true, people: 4, focused: 3 },
  { name: `${P}Gece Kuşları`, icon: 'users', category: 'Genel', description: 'Gece yarısından sonra da çalışanlar burada.', people: 7, focused: 2 },
  { name: `${P}İngilizce Konuşma`, icon: 'users', category: 'Dil', description: 'Çalışma arasında İngilizce sohbet.', people: 4, focused: 0 },
  { name: `${P}Tıp Staj Hazırlık`, icon: 'users', category: 'Tıp & Sağlık', description: 'Vaka tartışması ve tekrar.', people: 0, focused: 0 },
  { name: `${P}Boş Masa`, icon: 'users', category: 'Genel', description: 'Henüz kimse yok, ilk sen otur.', people: 0, focused: 0 },
];

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Üretim veritabanına sahte kullanıcı yazılmaz.');

  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const lobbies = dataSource.getRepository(Lobby);
  const daily = dataSource.getRepository(DailyAnalytics);
  const friendships = dataSource.getRepository(Friendship);
  const rand = random(7);

  // 1. Eski kayıtlarımızı temizle
  const old = await users.find({ where: { email: Like(`canli_%@${DOMAIN}`) }, select: { id: true } });
  await lobbies.delete({ name: In(ROOMS.map((room) => room.name)) });
  if (old.length) await users.delete({ id: In(old.map((user) => user.id)) });

  // 2. Sahte kullanıcılar
  const hash = await bcrypt.hash(PASSWORD, 10);
  const total = ROOMS.reduce((sum, room) => sum + room.people, 0) + 8; // 8 kişi odasız ama çevrim içi
  const fakes: User[] = [];
  for (let i = 0; i < total; i += 1) {
    const frame = FRAMES[Math.floor(rand() * FRAMES.length)];
    const username = `canli_${String(i + 1).padStart(2, '0')}`;
    fakes.push(
      await users.save(
        users.create({
          username,
          fullName: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
          email: `${username}@${DOMAIN}`,
          password: hash,
          isEmailVerified: true,
          isPremium: rand() < 0.3,
          role: 'user',
          coins: Math.round(rand() * 800),
          ownedProfileFrames: ['none', frame],
          equippedProfileFrame: frame,
          isOnline: false,
        }),
      ),
    );
  }

  // 3. Odalar ve yerleşim
  let cursor = 0;
  for (const spec of ROOMS) {
    const lobby = await lobbies.save(
      lobbies.create({
        name: spec.name,
        icon: spec.icon,
        category: spec.category,
        description: spec.description,
        maxUsers: spec.maxUsers ?? 50,
        allowVideo: spec.allowVideo ?? false,
        isPremiumOnly: spec.isPremiumOnly ?? false,
        isPrivate: spec.isPrivate ?? false,
        ...(spec.isPrivate ? { passwordHash: await bcrypt.hash('demo123', 10) } : {}),
        activeUsers: spec.focused,
      }),
    );
    const members = fakes.slice(cursor, cursor + spec.people);
    cursor += spec.people;
    if (members.length) await users.update({ id: In(members.map((member) => member.id)) }, { isOnline: true, currentRoom: lobby.name });
  }
  // Odasız ama çevrim içi olanlar
  const idle = fakes.slice(cursor);
  if (idle.length) await users.update({ id: In(idle.map((user) => user.id)) }, { isOnline: true, currentRoom: null });

  // 4. Bu haftanın odak geçmişi (sıralama için) ve toplamlar
  const today = localDayKey(new Date());
  const weekStart = localWeekStartKey(new Date());
  const rows: DailyAnalytics[] = [];
  for (const user of fakes) {
    const strength = 0.3 + rand() * 1.7;
    let sum = 0;
    for (let day = weekStart; day <= today; day = addDaysToKey(day, 1)) {
      if (rand() < 0.2 && day !== today) continue;
      const minutes = Math.round((30 + rand() * 150) * strength);
      const hourly = Array<number>(24).fill(0);
      hourly[[9, 10, 14, 15, 20, 21][Math.floor(rand() * 6)]] = minutes;
      sum += minutes;
      rows.push(daily.create({ user, date: day, focusMinutes: minutes, hourlyDistribution: hourly }));
    }
    const lifetime = sum + Math.round(rand() * 6000 * strength);
    const badges = ['İlk Adım', ...(lifetime >= 120 ? ['Maratoncu'] : []), ...(rand() < 0.4 ? ['Haftalık Seri'] : [])];
    await users.update(user.id, { totalFocusMinutes: lifetime, currentStreak: Math.floor(rand() * 12), bestStreak: 12, lastFocusDate: new Date(), badges });
  }
  await daily.save(rows);

  // 5. İstenirse sahte kullanıcılar seninle arkadaş olur
  const meEmail = process.env.SEED_ME_EMAIL?.trim();
  if (meEmail) {
    const me = await users.findOne({ where: { email: meEmail } });
    if (!me) {
      console.warn(`SEED_ME_EMAIL=${meEmail} ile kullanıcı bulunamadı; arkadaşlıklar atlandı.`);
    } else {
      const friends = fakes.slice(0, 14);
      const pending = fakes.slice(14, 16);
      await friendships.save([
        ...friends.map((friend) => friendships.create({ sender: friend, receiver: me, status: 'accepted' })),
        ...pending.map((sender) => friendships.create({ sender, receiver: me, status: 'pending' })),
      ]);
      console.log(`${friends.length} arkadaş ve ${pending.length} bekleyen istek ${meEmail} hesabına eklendi.`);
    }
  }

  await dataSource.destroy();
  console.log(`${ROOMS.length} oda, ${fakes.length} sahte kullanıcı hazır (canli_01 … canli_${String(fakes.length).padStart(2, '0')}@${DOMAIN}, şifre: ${PASSWORD}).`);
  console.log('Şifreli oda "Demo: Hukuk Grubu" şifresi: demo123');
}

main().catch(async (error: unknown) => {
  console.error('Seed başarısız:', error instanceof Error ? error.message : error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
