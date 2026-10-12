import { create } from 'zustand';
import { Award, BookOpen, CalendarCheck, Flame, Gem, Moon, Mountain, Sprout, Sunrise, Swords, Target, Timer, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from './api';
import type { BadgeDefinition } from './types';

/** Backend rozet kataloğundaki ikon adları (badges.ts) → lucide bileşenleri. */
const BADGE_ICONS: Record<string, LucideIcon> = {
  sprout: Sprout,
  timer: Timer,
  gem: Gem,
  flame: Flame,
  'calendar-check': CalendarCheck,
  moon: Moon,
  sunrise: Sunrise,
  mountain: Mountain,
  target: Target,
  swords: Swords,
  'book-open': BookOpen,
  trophy: Trophy,
};

export function badgeIcon(icon?: string): LucideIcon {
  return (icon && BADGE_ICONS[icon]) || Award;
}

/**
 * Web'de artık kazanılamayan rozetler katalogda gösterilmez (hedefler web'den kaldırıldı).
 * Daha önce kazananların profilinde görünmeye devam eder.
 */
const RETIRED_BADGES = new Set(['Hedef Avcısı']);

/** Rozet kataloğu bir kez yüklenir ve sayfalar arasında paylaşılır. */
export const useBadgeCatalog = create<{ badges: BadgeDefinition[]; load: () => Promise<void> }>((set, get) => ({
  badges: [],
  load: async () => {
    if (get().badges.length) return;
    const response = await api.get<BadgeDefinition[]>('/users/badges/catalog');
    set({ badges: response.data.filter((badge) => !RETIRED_BADGES.has(badge.name)) });
  },
}));
