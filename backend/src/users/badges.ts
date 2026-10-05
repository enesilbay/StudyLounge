/**
 * Rozet kataloğu ve odak oturumundan kazanılan rozetlerin kuralları.
 * Rozetler kullanıcıda adıyla saklanır (eski kayıtlar ve mobil uygulama adları kullanır),
 * bu yüzden `name` değiştirilmemeli.
 */
export interface BadgeDefinition {
  name: string;
  description: string;
  /** Web'de lucide ikon adı. */
  icon: string;
}

export const BADGE_NAMES = {
  firstStep: 'İlk Adım',
  marathon: 'Maratoncu',
  hundredHours: 'Yüz Saat',
  weekStreak: 'Haftalık Seri',
  monthStreak: 'Aylık Seri',
  nightOwl: 'Gece Kuşu',
  earlyBird: 'Sabahçı',
  longHaul: 'Uzun Soluklu',
  goalHunter: 'Hedef Avcısı',
  duelWinner: 'Düello Galibi',
  subjectMaster: 'Ders Ustası',
  weeklyChampion: 'Haftanın Şampiyonu',
} as const;

export const BADGES: BadgeDefinition[] = [
  { name: BADGE_NAMES.firstStep, description: 'İlk odak oturumunu tamamla.', icon: 'sprout' },
  { name: BADGE_NAMES.marathon, description: 'Toplam 2 saat odaklan.', icon: 'timer' },
  { name: BADGE_NAMES.hundredHours, description: 'Toplam 100 saat odaklan.', icon: 'gem' },
  { name: BADGE_NAMES.weekStreak, description: '7 gün üst üste çalış.', icon: 'flame' },
  { name: BADGE_NAMES.monthStreak, description: '30 gün üst üste çalış.', icon: 'calendar-check' },
  { name: BADGE_NAMES.nightOwl, description: 'Gece 00:00–05:00 arasında en az 1 saatlik oturum yap.', icon: 'moon' },
  { name: BADGE_NAMES.earlyBird, description: 'Sabah 05:00–08:00 arasında en az 1 saatlik oturum yap.', icon: 'sunrise' },
  { name: BADGE_NAMES.longHaul, description: 'Tek seferde 2 saat odaklan.', icon: 'mountain' },
  { name: BADGE_NAMES.goalHunter, description: 'Günlük hedefini 7 gün tuttur.', icon: 'target' },
  { name: BADGE_NAMES.duelWinner, description: 'Bir düello kazan.', icon: 'swords' },
  { name: BADGE_NAMES.subjectMaster, description: 'Tek bir derste 10 saat odaklan.', icon: 'book-open' },
  { name: BADGE_NAMES.weeklyChampion, description: 'Haftalık ligi birinci bitir.', icon: 'trophy' },
];

export interface FocusBadgeContext {
  totalFocusMinutes: number;
  currentStreak: number;
  /** Bu oturumun süresi (dakika). */
  sessionMinutes: number;
  /** Oturumun bittiği saat (Türkiye saati, 0–23). */
  endHour: number;
}

/** Bir odak oturumu bittiğinde kazanılan rozetler. */
export function focusBadges(context: FocusBadgeContext): string[] {
  const earned: string[] = [BADGE_NAMES.firstStep];
  if (context.totalFocusMinutes >= 120) earned.push(BADGE_NAMES.marathon);
  if (context.totalFocusMinutes >= 6000) earned.push(BADGE_NAMES.hundredHours);
  if (context.currentStreak >= 7) earned.push(BADGE_NAMES.weekStreak);
  if (context.currentStreak >= 30) earned.push(BADGE_NAMES.monthStreak);
  if (context.sessionMinutes >= 120) earned.push(BADGE_NAMES.longHaul);
  if (context.sessionMinutes >= 60 && context.endHour >= 0 && context.endHour <= 5) earned.push(BADGE_NAMES.nightOwl);
  if (context.sessionMinutes >= 60 && context.endHour >= 6 && context.endHour <= 8) earned.push(BADGE_NAMES.earlyBird);
  return earned;
}
