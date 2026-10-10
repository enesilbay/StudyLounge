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

/* ───────────────────────── Kullanıcılar ───────────────────────── */

export type UserFilter = 'premium' | 'admin' | 'muted' | 'banned' | 'unverified' | 'google';
export type UserSort = 'createdAt' | 'lastFocus' | 'totalFocus' | 'lastSeen';

export const USER_FILTERS: { key: UserFilter; label: string }[] = [
  { key: 'premium', label: 'Premium' },
  { key: 'admin', label: 'Yönetici' },
  { key: 'muted', label: 'Susturulmuş' },
  { key: 'banned', label: 'Yasaklı' },
  { key: 'unverified', label: 'E-posta doğrulanmamış' },
  { key: 'google', label: 'Google ile giriş' },
];

export const USER_SORTS: { key: UserSort; label: string }[] = [
  { key: 'createdAt', label: 'Kayıt tarihi' },
  { key: 'lastFocus', label: 'Son odak' },
  { key: 'totalFocus', label: 'Toplam odak' },
  { key: 'lastSeen', label: 'Son görülme' },
];

/** `GET /admin/users` satırı (backend `AdminUserRow`). */
export interface AdminUserRow {
  id: number;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
  premiumUntil: string | null;
  isEmailVerified: boolean;
  google: boolean;
  mutedUntil: string | null;
  bannedAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  totalFocusMinutes: number;
  lastFocusAt: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type AdminActionType =
  | 'mute'
  | 'unmute'
  | 'ban'
  | 'unban'
  | 'role'
  | 'premium_grant'
  | 'premium_revoke'
  | 'verify_email'
  | 'delete_user'
  | 'report_resolve'
  | 'report_dismiss'
  | 'export_users';

export const ACTION_LABELS: Record<AdminActionType, { label: string; tone: 'neutral' | 'danger' | 'info' | 'success' | 'primary' }> = {
  mute: { label: 'Susturma', tone: 'info' },
  unmute: { label: 'Susturma kaldırıldı', tone: 'neutral' },
  ban: { label: 'Yasak', tone: 'danger' },
  unban: { label: 'Yasak kaldırıldı', tone: 'neutral' },
  role: { label: 'Rol değişti', tone: 'primary' },
  premium_grant: { label: 'Premium verildi', tone: 'success' },
  premium_revoke: { label: 'Premium geri alındı', tone: 'neutral' },
  verify_email: { label: 'E-posta onaylandı', tone: 'success' },
  delete_user: { label: 'Hesap silindi', tone: 'danger' },
  report_resolve: { label: 'Şikayet çözüldü', tone: 'neutral' },
  report_dismiss: { label: 'Şikayet kapatıldı', tone: 'neutral' },
  export_users: { label: 'Liste indirildi', tone: 'neutral' },
};

export interface AdminActionRow {
  id: number;
  action: AdminActionType;
  reason: string | null;
  details: Record<string, unknown> | null;
  adminLabel: string | null;
  targetLabel: string | null;
  createdAt: string;
  admin: { id: number; username: string; fullName: string } | null;
  target: { id: number; username: string; fullName: string } | null;
}

export interface AdminUserDetail {
  user: AdminUserRow & {
    currentStreak: number;
    bestStreak: number;
    coins: number;
    dailyGoalMinutes: number;
    weeklyGoalMinutes: number;
    isOnline: boolean;
    currentRoom: string | null;
  };
  focusDaily: { date: string; minutes: number }[];
  recentSessions: { id: number; startedAt: string; endedAt: string; minutes: number; roomName: string | null; subject: string | null; source: string }[];
  reports: {
    against: number;
    againstOpen: number;
    filed: number;
    recent: { id: number; reason: string; status: string; details: string | null; messageText: string | null; createdAt: string; reporterUsername: string | null }[];
  };
  payments: { id: number; planId: string; amount: string; currency: string; status: string; createdAt: string; premiumUntil: string | null }[];
  actions: AdminActionRow[];
}

export const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
export const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });
const relative = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

/** "3 gün önce", "dün", "az önce". Boşsa "—". */
export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return '—';
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'az önce';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day');
  if (abs < 86400 * 365) return relative.format(Math.round(seconds / (86400 * 30)), 'month');
  return relative.format(Math.round(seconds / (86400 * 365)), 'year');
}

/** Satırdaki durum rozetleri; listede ve ayrıntıda aynı sıra. */
export function userBadges(user: Pick<AdminUserRow, 'role' | 'isPremium' | 'mutedUntil' | 'bannedAt' | 'isEmailVerified'>) {
  const badges: { label: string; tone: 'neutral' | 'danger' | 'info' | 'primary' | 'violet' }[] = [];
  if (user.bannedAt) badges.push({ label: 'Yasaklı', tone: 'danger' });
  if (user.mutedUntil && new Date(user.mutedUntil) > new Date()) badges.push({ label: 'Susturulmuş', tone: 'info' });
  if (user.role === 'admin') badges.push({ label: 'Yönetici', tone: 'primary' });
  if (user.isPremium) badges.push({ label: 'Premium', tone: 'violet' });
  if (!user.isEmailVerified) badges.push({ label: 'Doğrulanmamış', tone: 'neutral' });
  return badges;
}
