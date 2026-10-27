export type FrameId = 'none' | 'gold' | 'emerald' | 'ruby' | 'cosmic' | string;

export interface User {
  id: number;
  username?: string;
  fullName: string;
  email: string;
  /** Hesabın şifresi var mı (yalnızca Google ile açılmış hesaplarda false). */
  hasPassword?: boolean;
  isPremium?: boolean;
  score?: number;
  avatarUrl?: string | null;
  totalFocusMinutes?: number;
  coins?: number;
  equippedProfileFrame?: FrameId;
  equippedBubbleColor?: string;
  equippedIcon?: string | null;
  equippedSoundPack?: string;
  equippedProfileCover?: string;
  equippedLampColor?: string;
  ownedProfileCovers?: string[];
  ownedLampColors?: string[];
  /** Elde tutulan seri koruma sayısı. */
  streakFreezes?: number;
  bestStreak?: number;
  currentStreak?: number;
  ownedColors?: string[];
  ownedIcons?: string[];
  ownedSoundPacks?: string[];
  ownedProfileFrames?: string[];
  badges?: string[];
  isOnline?: boolean;
  currentRoom?: string | null;
  /** 'user' | 'admin' */
  role?: string;
  mutedUntil?: string | null;
  bannedAt?: string | null;
}

/** Başkalarının görebildiği profil (`GET /users/:id/public`). */
export interface PublicProfile {
  id: number;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  equippedProfileFrame?: FrameId;
  equippedProfileCover?: string;
  isPremium?: boolean;
  isOnline?: boolean;
  currentRoom?: string | null;
  totalFocusMinutes: number;
  weekMinutes: number;
  currentStreak?: number;
  bestStreak?: number;
  badges: string[];
  friendship: { status: 'self' | 'none' | 'friends' | 'outgoing' | 'incoming'; requestId: number | null };
  blockedByMe: boolean;
}

export interface BadgeDefinition {
  name: string;
  description: string;
  icon: string;
}

export interface WeeklyEntry {
  rank: number;
  minutes: number;
  user: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame' | 'isPremium'>;
}

export interface WeeklyLeague {
  weekStart: string;
  weekEnd: string;
  rewards: number[];
  entries: WeeklyEntry[];
  me: { rank: number; minutes: number } | null;
}

export interface WeeklyChampions {
  weekStart: string;
  podium: { id: number; rank: number; minutes: number; reward: number; user: WeeklyEntry['user'] }[];
}

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'cheating' | 'other';

export interface AdminReport {
  id: number;
  reason: ReportReason;
  details: string | null;
  messageText: string | null;
  roomName: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
  reporter: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl'>;
  target: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'mutedUntil' | 'bannedAt'>;
  resolvedBy: { id: number; fullName: string } | null;
}

/** Bana gelen, bekleyen arkadaşlık isteği (`GET /users/friend-requests/:id`). */
export interface FriendRequest {
  id: number;
  status: 'pending';
  sender: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame'>;
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
  /** Kamera ve ekran paylaşımına izin verilen oda (sadece web). */
  allowVideo?: boolean;
  createdAt?: string;
  /** Odayı kuran kişi; oda ayarlarını yalnızca o değiştirebilir. */
  ownerId?: number | null;
  /** Oda sahibi yeni girişleri kapattı mı. */
  isLocked?: boolean;
  /** İstek atan oda sahibi ya da şifreyi daha önce doğruladı mı. */
  hasAccess?: boolean;
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
  /** Oda sohbetinde gönderenin balon rengi (socket mesajlarında gelir). */
  equippedBubbleColor?: string | null;
}

export interface RoomUser {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
  equippedProfileFrame?: FrameId | null;
  equippedBubbleColor?: string | null;
  equippedIcon?: string | null;
  equippedLampColor?: string | null;
  roomName: string;
  isAtDesk: boolean;
  isEliteRoom: boolean;
  isPremium: boolean;
  // Web aramasındaki medya durumu; mobil istemciler için her zaman false gelir.
  isInCall?: boolean;
  isCameraOn?: boolean;
  isMicOn?: boolean;
  isScreenSharing?: boolean;
}

export interface MediaState {
  camera: boolean;
  mic: boolean;
  screen: boolean;
}

export interface DailyAnalytics {
  id?: number;
  date: string;
  focusMinutes: number;
  hourlyDistribution?: number[];
}

export interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  price: number;
}

export type ShopItemType = 'color' | 'icon' | 'soundPack' | 'profileFrame' | 'profileCover' | 'lampColor' | 'streakFreeze';

