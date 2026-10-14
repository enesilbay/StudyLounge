import { create } from 'zustand';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import type { FriendRequest, User } from '../lib/types';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  /** Tıklanınca gidilecek uygulama içi adres. */
  to?: string;
}

interface InboxState {
  /** Okunmamış DM'i olan arkadaşların id'leri. */
  unreadFrom: number[];
  friendRequests: FriendRequest[];
  /** DM sayfasında şu an açık olan sohbet; o kişiden gelen mesaj okunmamış sayılmaz. */
  viewingDmWith: number | null;
  toasts: Toast[];
  refresh: () => Promise<void>;
  addUnread: (senderId: number) => void;
  markRead: (senderId: number) => void;
  setViewingDmWith: (userId: number | null) => void;
  respondToRequest: (requestId: number, status: 'accepted' | 'rejected') => Promise<void>;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  reset: () => void;
}

const TOAST_LIFETIME_MS = 6000;
let nextToastId = 1;

export const useInboxStore = create<InboxState>((set, get) => ({
  unreadFrom: [],
  friendRequests: [],
  viewingDmWith: null,
  toasts: [],

  refresh: async () => {
    const [senders, requests] = await Promise.allSettled([
      api.get<User[]>('/messages/unread/dm-senders'),
      // :userId backend'de yok sayılır, oturumdaki kullanıcı kullanılır.
      api.get<FriendRequest[]>('/users/friend-requests/me'),
    ]);
    const viewing = get().viewingDmWith;
    set({
      ...(senders.status === 'fulfilled'
        ? { unreadFrom: unwrapData<User[]>(senders.value.data).map((sender) => sender.id).filter((id) => id !== viewing) }
        : {}),
      ...(requests.status === 'fulfilled' ? { friendRequests: unwrapData<FriendRequest[]>(requests.value.data) } : {}),
    });
  },

  addUnread: (senderId) =>
    set((state) => (state.unreadFrom.includes(senderId) ? state : { unreadFrom: [...state.unreadFrom, senderId] })),

  markRead: (senderId) => {
    set((state) => ({ unreadFrom: state.unreadFrom.filter((id) => id !== senderId) }));
    void api.post(`/messages/dm/${senderId}/read`).catch(() => undefined);
  },

  setViewingDmWith: (userId) => set({ viewingDmWith: userId }),

  respondToRequest: async (requestId, status) => {
    await api.post('/users/respond-request', { requestId, status });
    set((state) => ({ friendRequests: state.friendRequests.filter((request) => request.id !== requestId) }));
  },

  pushToast: (toast) => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { ...toast, id }] }));
    setTimeout(() => get().dismissToast(id), TOAST_LIFETIME_MS);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  reset: () => set({ unreadFrom: [], friendRequests: [], viewingDmWith: null, toasts: [] }),
}));
