/** Toplam odak dakikasına göre rütbeler (profil ve herkese açık profil aynı tabloyu kullanır). */
export const RANKS = [
  { title: 'Çaylak', min: 0, max: 50 },
  { title: 'Odaklı', min: 50, max: 200 },
  { title: 'Akademisyen', min: 200, max: 500 },
  { title: 'Usta', min: 500, max: 1000 },
  { title: 'Efsane', min: 1000, max: null },
] as const;

export function rankIndexFor(minutes: number) {
  const index = RANKS.findIndex((rank) => rank.max === null || (minutes >= rank.min && minutes < rank.max));
  return index < 0 ? 0 : index;
}

/** Bir sonraki rütbeye ilerleme; en üst rütbede yüzde 100. */
export function rankProgress(minutes: number) {
  const index = rankIndexFor(minutes);
  const rank = RANKS[index];
  if (rank.max === null) return { index, current: minutes, total: minutes || 1, percentage: 100, next: null as string | null, remaining: 0 };
  const current = Math.max(0, minutes - rank.min);
  const total = rank.max - rank.min;
  return { index, current, total, percentage: Math.min(100, (current / total) * 100), next: RANKS[index + 1]?.title ?? null, remaining: rank.max - minutes };
}
