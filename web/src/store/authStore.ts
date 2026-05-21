import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: number;
  fullName: string;
  email: string;
  isPremium?: boolean;
  score?: number;
  avatarUrl?: string;
  totalFocusMinutes?: number;
  coins?: number;
  equippedProfileFrame?: string;
  equippedBubbleColor?: string;
  equippedIcon?: string;
  bestStreak?: number;
  currentStreak?: number;
  ownedProfileFrames?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isInitializing: true,
  login: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  initAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isInitializing: false });
      return;
    }
    
    try {
      const response = await api.get('/users/me');
      set({ user: response.data, isAuthenticated: true, isInitializing: false });
    } catch (error) {
      localStorage.removeItem('access_token');
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    }
  }
}));
