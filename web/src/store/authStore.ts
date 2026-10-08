import { create } from 'zustand';
import type { AuthEnvelope, ApiEnvelope } from '../lib/apiResponses';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface RegisterPayload {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

export interface LoginResult {
  requiresVerification: boolean;
  /** Doğrulama bekleyen hesabın e-postası (kullanıcı adıyla girişte doğrulama ekranı bunu kullanır). */
  email?: string;
  message?: string;
  /** Doğrulama e-postası gönderilebildi mi (yalnız `requiresVerification` iken anlamlı). */
  mailSent?: boolean;
}

export interface RegisterResult {
  message?: string;
  mailSent: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User, token: string) => void;
  /** Hesap e-posta doğrulaması bekliyorsa token kaydedilmez, `requiresVerification` döner. */
  /** identifier: e-posta ya da kullanıcı adı. */
  loginWithCredentials: (identifier: string, password: string) => Promise<LoginResult>;
  /** Google Identity Services'in verdiği ID token ile giriş. */
  loginWithGoogle: (credential: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  registerWithCredentials: (payload: RegisterPayload) => Promise<RegisterResult>;
  setUser: (user: User) => void;
  refreshUser: () => Promise<User | null>;
  clearError: () => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    const stored = localStorage.getItem('user_data');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isInitializing: true,
  isLoading: false,
  error: null,
  login: (user, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, error: null });
  },
  loginWithCredentials: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      // Alan adı eski backend sürümleriyle uyum için "email"; kullanıcı adı da kabul edilir.
      const response = await api.post<AuthEnvelope<User> & { requiresVerification?: boolean; email?: string; message?: string; mailSent?: boolean }>('/auth/login', {
        email: identifier,
        password,
      });
      const { user, access_token: token, requiresVerification, email, message, mailSent } = response.data;
      if (requiresVerification || !token) {
        set({ isLoading: false, error: null });
        return { requiresVerification: true, email, message, mailSent: mailSent !== false };
      }
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
      return { requiresVerification: false };
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error) });
      throw error;
    }
  },
  loginWithGoogle: async (credential) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<AuthEnvelope<User>>('/auth/google', { credential });
      const { user, access_token: token } = response.data;
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error) });
      throw error;
    }
  },
  verifyEmail: async (email, code) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<AuthEnvelope<User>>('/auth/verify-email', { email, token: code });
      const { user, access_token: token } = response.data;
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error) });
      throw error;
    }
  },
  registerWithCredentials: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ message?: string; mailSent?: boolean }>('/auth/register', payload);
      set({ isLoading: false, error: null });
      // Eski backend mailSent döndürmez; o durumda gönderildi sayılır.
      return { message: response.data?.message, mailSent: response.data?.mailSent !== false };
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error) });
      throw error;
    }
  },
  setUser: (user) => {
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ user, isAuthenticated: true, error: null });
  },
  refreshUser: async () => {
    const token = get().token;
    if (!token) {
      return null;
    }
    try {
      const response = await api.get<ApiEnvelope<User>>('/users/me');
      const user = unwrapUser<User>(response.data);
      localStorage.setItem('user_data', JSON.stringify(user));
      set({ user, isAuthenticated: true, error: null });
      return user;
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      set({ user: null, token: null, isAuthenticated: false });
      return null;
    }
  },
  clearError: () => {
    set({ error: null });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
  initAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isInitializing: false });
      return;
    }
    
    try {
      const response = await api.get<ApiEnvelope<User>>('/users/me');
      const user = unwrapUser<User>(response.data);
      localStorage.setItem('user_data', JSON.stringify(user));
      set({ user, isAuthenticated: true, isInitializing: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    }
  }
}));
