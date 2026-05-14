import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { apiUrl, assetUrl } from '../config/api';
import { C } from './sensor';
import { getRankInfo, getRankProgress } from '../utils/rank';
import { Theme } from '../utils/theme';

const T = C;

type UserProfile = {
  id: number;
  fullName: string;
  username: string;
  totalFocusMinutes: number;
  isPremium: boolean;
  avatarUrl?: string;
  coins?: number;
  currentStreak?: number;
  badges?: string[];
  equippedIcon?: string;
};

type Friend = {
  id: number;
  fullName: string;
  username: string;
  totalFocusMinutes: number;
  avatarUrl?: string;
  isOnline?: boolean;
  currentRoom?: string;
};

const QUICK_ACTIONS = [
  { id: 'messages', icon: 'comment-dots', label: 'Mesajlar', color: '#4F46E5', bg: '#EEF2FF', route: null },
  { id: 'shop', icon: 'shopping-cart', label: 'Mağaza', color: '#D97706', bg: '#FEF3C7', route: '/shop' },
  { id: 'analytics', icon: 'chart-line', label: 'Analitik', color: '#059669', bg: '#D1FAE5', route: '/analytics' },
  { id: 'leaderboard', icon: 'trophy', label: 'Liderlik', color: '#7C3AED', bg: '#EDE9FE', route: '/leaderboard' },
];

export default function MeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [meRes, friendsRes] = await Promise.all([
        fetch(apiUrl('/users/me'), { headers }),
        fetch(apiUrl('/users/friends'), { headers }),
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
      }
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a: Friend, b: Friend) =>
          (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)
        );
        setFriends(sorted);
      }
    } catch (e) {
      console.log('Me tab fetch error:', e);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]));

  const handleQuickAction = async (action: typeof QUICK_ACTIONS[0]) => {
    if (action.id === 'analytics' && user && !user.isPremium) {
      router.push({ pathname: '/premium', params: { id: user.id } } as any);
      return;
    }
    if (action.id === 'messages') {
      // Mesajlar için arkadaş listesine kaydır (sayfada mevcut)
      return;
    }
    if (action.route) router.push(action.route as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingContainer}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const rank = getRankInfo(user.totalFocusMinutes);
  const progress = getRankProgress(user.totalFocusMinutes);
  const onlineFriends = friends.filter(f => f.isOnline);
  const offlineFriends = friends.filter(f => !f.isOnline);

  return (
    <SafeAreaView style={s.safe}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Ben</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/profile', params: { id: user.id } } as any)}>
            <FontAwesome5 name="cog" size={20} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── PROFİL KARTI ── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/profile', params: { id: user.id } } as any)}
        >
          <LinearGradient
            colors={[T.primary, '#3949AB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.profileCard}
          >
            {/* Avatar */}
            <View style={s.avatarContainer}>
              {user.avatarUrl ? (
                <Image source={{ uri: assetUrl(user.avatarUrl) ?? undefined }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {user.isPremium && (
                <View style={s.premiumBadge}>
                  <FontAwesome5 name="crown" size={9} color={T.accent} solid />
                </View>
              )}
            </View>

            <View style={s.profileInfo}>
              <Text style={s.profileName}>
                {user.fullName} {user.equippedIcon || ''}
              </Text>
              <Text style={s.profileUsername}>@{user.username}</Text>

              {/* Rütbe */}
              <View style={s.rankRow}>
                <FontAwesome5 name={rank.icon} size={12} color={rank.color} solid />
                <Text style={[s.rankText, { color: rank.color }]}>{rank.title}</Text>
              </View>
            </View>

            {/* Stat Badges */}
            <View style={s.statBadges}>
              <View style={s.statBadge}>
                <FontAwesome5 name="fire-alt" size={12} color="#FF6B6B" solid />
                <Text style={s.statBadgeText}>{user.currentStreak ?? 0}</Text>
              </View>
              <View style={s.statBadge}>
                <FontAwesome5 name="coins" size={12} color={T.accent} solid />
                <Text style={s.statBadgeText}>{user.coins ?? 0}</Text>
              </View>
            </View>

            {/* İlerleme Çubuğu */}
            <View style={s.progressSection}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${Math.min(progress.percentage, 100)}%` }]} />
              </View>
              <Text style={s.progressLabel}>
                {progress.nextRank ? `${rank.title} → ${progress.nextRank}` : 'Efsane Seviye 🏆'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── HIZLI ERİŞİM IZGARASI ── */}
        <Text style={s.sectionTitle}>Hızlı Erişim</Text>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const isLocked = action.id === 'analytics' && !user.isPremium;
            return (
              <TouchableOpacity
                key={action.id}
                style={[s.quickCard, { backgroundColor: action.bg }]}
                activeOpacity={0.8}
                onPress={() => handleQuickAction(action)}
              >
                <View style={[s.quickIconBox, { backgroundColor: action.color }]}>
                  <FontAwesome5
                    name={isLocked ? 'lock' : action.icon}
                    size={20}
                    color="#FFF"
                    solid
                  />
                </View>
                <Text style={[s.quickLabel, { color: action.color }]}>{action.label}</Text>
                {isLocked && (
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── ARKADAŞLAR ── */}
        <View style={s.friendsHeader}>
          <Text style={s.sectionTitle}>Arkadaşlar</Text>
          <TouchableOpacity onPress={() => router.push('/leaderboard' as any)}>
            <Text style={s.seeAll}>Tümü →</Text>
          </TouchableOpacity>
        </View>

        {friends.length === 0 ? (
          <View style={s.emptyFriends}>
            <FontAwesome5 name="user-friends" size={28} color={T.textMuted} />
            <Text style={s.emptyText}>Henüz arkadaş yok</Text>
            <Text style={s.emptySubText}>Keşfet sekmesinden arkadaş ekleyebilirsin.</Text>
          </View>
        ) : (
          <>
            {onlineFriends.length > 0 && (
              <>
                <Text style={s.subSectionTitle}>🟢 Çevrimiçi ({onlineFriends.length})</Text>
                {onlineFriends.map(friend => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    onDM={() => router.push({
                      pathname: '/dm',
                      params: { targetUserId: friend.id, targetName: friend.fullName, targetUsername: friend.username }
                    } as any)}
                  />
                ))}
              </>
            )}
            {offlineFriends.length > 0 && (
              <>
                <Text style={[s.subSectionTitle, { marginTop: 12 }]}>⚫ Çevrimdışı</Text>
                {offlineFriends.slice(0, 5).map(friend => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    onDM={() => router.push({
                      pathname: '/dm',
                      params: { targetUserId: friend.id, targetName: friend.fullName, targetUsername: friend.username }
                    } as any)}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function FriendRow({ friend, onDM }: { friend: Friend; onDM: () => void }) {
  return (
    <View style={s.friendRow}>
      <View style={s.friendAvatar}>
        {friend.avatarUrl ? (
          <Image source={{ uri: assetUrl(friend.avatarUrl) ?? undefined }} style={s.friendAvatarImg} />
        ) : (
          <Text style={s.friendAvatarText}>{friend.fullName.charAt(0).toUpperCase()}</Text>
        )}
        <View style={[s.onlineDot, { backgroundColor: friend.isOnline ? T.success : T.textMuted }]} />
      </View>

      <View style={s.friendInfo}>
        <Text style={s.friendName} numberOfLines={1}>{friend.fullName}</Text>
        <Text style={s.friendSub} numberOfLines={1}>
          {friend.isOnline
            ? (friend.currentRoom ? `📚 ${friend.currentRoom} odasında` : '🟢 Çevrimiçi')
            : `${friend.totalFocusMinutes} dk odak`}
        </Text>
      </View>

      <TouchableOpacity style={s.dmBtn} onPress={onDM} activeOpacity={0.8}>
        <FontAwesome5 name="comment-dots" size={14} color={T.primary} solid />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: T.textDark, fontSize: 28, fontWeight: '900' },

  // Profil Kartı
  profileCard: {
    borderRadius: 24, padding: 20, marginBottom: 28,
    ...Theme.shadows.medium,
  },
  avatarContainer: { position: 'absolute', top: 20, right: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarFallback: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  premiumBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { paddingRight: 80 },
  profileName: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  profileUsername: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankText: { fontSize: 13, fontWeight: '800' },

  statBadges: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 14 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statBadgeText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  progressSection: { gap: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: T.accent, borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },

  // Hızlı Erişim
  sectionTitle: { color: T.textDark, fontSize: 18, fontWeight: '900', marginBottom: 14 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  quickCard: {
    width: '47%', padding: 18, borderRadius: 20, alignItems: 'center', gap: 10,
    ...Theme.shadows.soft,
  },
  quickIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  proBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: T.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  proBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  // Arkadaşlar
  friendsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { color: T.primary, fontSize: 14, fontWeight: '700' },
  subSectionTitle: { color: T.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  emptyFriends: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: T.textDark, fontSize: 16, fontWeight: '800' },
  emptySubText: { color: T.textMuted, fontSize: 13, textAlign: 'center' },

  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: T.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: T.border,
    ...Theme.shadows.soft,
  },
  friendAvatar: { position: 'relative' },
  friendAvatarImg: { width: 46, height: 46, borderRadius: 23 },
  friendAvatarText: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: T.softIndigo, textAlign: 'center', lineHeight: 46,
    color: T.primary, fontSize: 18, fontWeight: '900',
  },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: T.surface },
  friendInfo: { flex: 1 },
  friendName: { color: T.textDark, fontSize: 15, fontWeight: '800' },
  friendSub: { color: T.textMuted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  dmBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.border,
  },
});
