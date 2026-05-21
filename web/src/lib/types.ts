import type { LucideIcon } from 'lucide-react';

export type FrameId = 'none' | 'gold' | 'emerald' | 'ruby' | 'cosmic' | string;

export interface User {
  id: number;
  username?: string;
  fullName: string;
  email: string;
  isPremium?: boolean;
  score?: number;
  avatarUrl?: string | null;
  totalFocusMinutes?: number;
  coins?: number;
  equippedProfileFrame?: FrameId;
  equippedBubbleColor?: string;
  equippedIcon?: string | null;
  equippedSoundPack?: string;
  bestStreak?: number;
  currentStreak?: number;
  ownedColors?: string[];
  ownedIcons?: string[];
  ownedSoundPacks?: string[];
  ownedProfileFrames?: string[];
  badges?: string[];
  isOnline?: boolean;
  currentRoom?: string | null;
}

export interface Lobby {
  id: number;
  name: string;
  icon?: string;
  category?: string | null;
  description?: string | null;
  activeUsers?: number;
  memberCount?: number;
  maxUsers?: number;
  isPrivate?: boolean;
  isPremiumOnly?: boolean;
  createdAt?: string;
}

export interface Message {
  id: number;
  text: string;
  roomName?: string;
  type?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  createdAt?: string;
  timestamp?: string;
  fullName?: string;
  userId?: number;
  senderName?: string;
  senderId?: number;
  receiverId?: number;
  user?: User;
  sender?: User;
  receiver?: User;
  isRead?: boolean;
}

export interface RoomUser {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
  equippedProfileFrame?: FrameId | null;
  equippedBubbleColor?: string | null;
  equippedIcon?: string | null;
  roomName: string;
  isAtDesk: boolean;
  isEliteRoom: boolean;
  isPremium: boolean;
}

export interface DuelRequest {
  duelId: string;
  challengerName: string;
  betAmount: number;
}

export interface DuelResult {
  winner: boolean;
  opponentName?: string;
  betAmount: number;
}

export interface DailyAnalytics {
  id?: number;
  date: string;
  focusMinutes: number;
  hourlyDistribution?: number[];
}

export interface ShopItem {
  id: string;
  type: 'color' | 'icon' | 'soundPack' | 'profileFrame';
  name: string;
  price: number;
  color?: string;
  text?: string;
}

export interface ShopSection {
  title: string;
  icon: LucideIcon;
  items: ShopItem[];
}
