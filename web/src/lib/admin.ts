import { create } from 'zustand';
import { api } from './api';

/** Yönetim paneli: `GET /admin/overview` yanıtı (backend `admin-overview.service.ts` ile aynı). */
export type OverviewPeriod = 7 | 30 | 90;
export const OVERVIEW_PERIODS: OverviewPeriod[] = [7, 30, 90];

export interface Comparison {
  current: number;
  previous: number;
}

export interface AdminPending {
  openReports: number;
  openFeedback: number;
  premiumExpiringSoon: number;
}

export interface AdminOverview {
  period: OverviewPeriod;
  /** Dönemin ilk günü (YYYY-MM-DD, Türkiye saati). */
  from: string;
  generatedAt: string;
  pending: AdminPending;
  totals: { users: number; premiumUsers: number };
  newUsers: Comparison;
  focusUsers: Comparison;
  focusMinutes: Comparison;
  activeUsers: { period: number; today: number };
  live: { rooms: number; people: number };
  daily: { date: string; newUsers: number; focusUsers: number; focusMinutes: number }[];
  funnel: { registered: number; addedSubject: number; setGoal: number; firstFocus: number };
  retention: { day: number; eligible: number; retained: number }[];
  heatmap: { dow: number; hour: number; minutes: number }[];
}

interface PendingState {
  pending: AdminPending | null;
  /** Şikayet ya da geri bildirim kapatıldıktan sonra menüdeki rozetleri tazeler. */
  refresh: () => Promise<void>;
}

export const useAdminPending = create<PendingState>((set) => ({
  pending: null,
  refresh: async () => {
    try {
      const response = await api.get<AdminPending>('/admin/overview/pending');
      set({ pending: response.data });
    } catch {
      // Rozetler yardımcıdır; alınamazsa menü rozetsiz kalır.
    }
  },
}));

/** Genel bakıştaki günlük eğilim grafiğinde seçilebilen seriler. */
export type TrendSeries = 'newUsers' | 'focusUsers' | 'focusMinutes';

export const TREND_SERIES: { key: TrendSeries; label: string }[] = [
  { key: 'newUsers', label: 'Yeni kullanıcı' },
  { key: 'focusUsers', label: 'Odaklanan' },
  { key: 'focusMinutes', label: 'Odak süresi' },
];

export const numberFormatter =new Intl.NumberFormat('tr-TR');

/** 95 → "1 sa 35 dk"; 1.240 saati geçen değerler yalnızca saatle yazılır. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${numberFormatter.format(minutes)} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 100 || !rest) return `${numberFormatter.format(hours)} sa`;
  return `${hours} sa ${rest} dk`;
}

/** YYYY-MM-DD → yerel öğlen (saat dilimi kaymasıyla gün değişmesin). */
export function parseDay(day: string): Date {
  return new Date(`${day}T12:00:00`);
}
