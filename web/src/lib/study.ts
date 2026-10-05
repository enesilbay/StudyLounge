import type { User } from './types';

export type SubjectColor = 'blue' | 'orange' | 'aqua' | 'yellow' | 'magenta' | 'green' | 'violet' | 'red';

/** Yeni derslere bu sırayla renk verilir; sıra renk körlüğü ayrımı için doğrulandı (dataviz referans paleti). */
export const SUBJECT_COLORS: SubjectColor[] = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red'];

/** Tailwind sınıfları derleme sırasında taranabilsin diye tam yazılır (index.css'teki --color-subj-* token'ları). */
export const subjectDotClass: Record<SubjectColor, string> = {
  blue: 'bg-subj-blue',
  orange: 'bg-subj-orange',
  aqua: 'bg-subj-aqua',
  yellow: 'bg-subj-yellow',
  magenta: 'bg-subj-magenta',
  green: 'bg-subj-green',
  violet: 'bg-subj-violet',
  red: 'bg-subj-red',
};

export function dotClassFor(color?: string | null) {
  return subjectDotClass[color as SubjectColor] ?? subjectDotClass.blue;
}

export interface Subject {
  id: number;
  name: string;
  color: SubjectColor;
  archived: boolean;
}

export interface StudySession {
  id: number;
  startedAt: string;
  endedAt: string;
  minutes: number;
  creditedMinutes: number;
  source: 'web' | 'mobile';
  roomName: string | null;
  subject: Subject | null;
}

export interface StudySummary {
  days: number;
  sessionCount: number;
  sessionMinutes: number;
  bySubject: { subjectId: number | null; name: string | null; color: SubjectColor | null; minutes: number }[];
  daily: { date: string; minutes: number }[];
}

export interface GoalProgress {
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  rewardedToday: boolean;
  dailyGoalBonus: number;
}

export interface Task {
  id: number;
  title: string;
  done: boolean;
  current: boolean;
  subject: Subject | null;
  createdAt: string;
  doneAt: string | null;
}

type PublicUser = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame'>;

export interface ScheduledSession {
  id: number;
  title: string;
  startsAt: string;
  durationMinutes: number;
  owner: PublicUser;
  lobby: { id: number; name: string } | null;
  invites: { id: number; status: 'pending' | 'accepted' | 'declined'; user: PublicUser }[];
}

/** "1 sa 25 dk" / "40 dk" */
export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} dk`;
  return minutes ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}
