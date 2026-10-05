import { create } from 'zustand';
import { api } from '../lib/api';
import type { GoalProgress, Subject, SubjectColor } from '../lib/study';
import { SUBJECT_COLORS } from '../lib/study';

const selectedKey = (userId: number) => `sl-subject-${userId}`;

interface StudyState {
  subjects: Subject[];
  subjectsLoaded: boolean;
  /** Odada seçili ders; kullanıcı başına tarayıcıda hatırlanır. */
  selectedSubjectId: number | null;
  goals: GoalProgress | null;
  loadSubjects: (userId: number) => Promise<void>;
  createSubject: (name: string) => Promise<Subject>;
  selectSubject: (userId: number, subjectId: number | null) => void;
  refreshGoals: () => Promise<void>;
  updateGoals: (changes: Partial<Pick<GoalProgress, 'dailyGoalMinutes' | 'weeklyGoalMinutes'>>) => Promise<void>;
  reset: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  subjects: [],
  subjectsLoaded: false,
  selectedSubjectId: null,
  goals: null,

  loadSubjects: async (userId) => {
    const response = await api.get<Subject[]>('/study/subjects');
    let selected: number | null = null;
    try {
      selected = Number(localStorage.getItem(selectedKey(userId))) || null;
    } catch {
      selected = null;
    }
    // Silinmiş ya da arşivlenmiş ders seçili kalmasın.
    if (selected && !response.data.some((subject) => subject.id === selected)) selected = null;
    set({ subjects: response.data, subjectsLoaded: true, selectedSubjectId: selected });
  },

  createSubject: async (name) => {
    // Yeni derse sıradaki renk verilir; aynı adlı ders varsa backend onu döner.
    const color: SubjectColor = SUBJECT_COLORS[get().subjects.length % SUBJECT_COLORS.length];
    const response = await api.post<Subject>('/study/subjects', { name, color });
    set((state) => ({
      subjects: state.subjects.some((subject) => subject.id === response.data.id) ? state.subjects : [...state.subjects, response.data],
    }));
    return response.data;
  },

  selectSubject: (userId, subjectId) => {
    set({ selectedSubjectId: subjectId });
    try {
      if (subjectId) localStorage.setItem(selectedKey(userId), String(subjectId));
      else localStorage.removeItem(selectedKey(userId));
    } catch {
      // Gizli sekmede depolama kapalı olabilir; seçim yalnızca bu oturumda kalır.
    }
  },

  refreshGoals: async () => {
    const response = await api.get<GoalProgress>('/study/goals');
    set({ goals: response.data });
  },

  updateGoals: async (changes) => {
    const response = await api.put<GoalProgress>('/study/goals', changes);
    set({ goals: response.data });
  },

  reset: () => set({ subjects: [], subjectsLoaded: false, selectedSubjectId: null, goals: null }),
}));
