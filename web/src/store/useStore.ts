import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  totalFocusMinutes?: number;
  isPremium?: boolean;
  equippedIcon?: string;
  equippedColor?: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('study_storage');
      },
    }),
    {
      name: 'study_storage',
    }
  )
);
