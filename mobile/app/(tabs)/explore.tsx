import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { apiUrl, assetUrl, getAuthHeaders } from '../config/api';
import { AppScreen, SearchInput, SoftCard } from '../components/common';
import { C } from './sensor';

const T = C;

type Lobby = {
  id: number;
  name: string;
  icon?: string;
  description?: string;
  activeUsers?: number;
  isPrivate?: boolean;
  isPremiumOnly?: boolean;
};

type Leader = {
  id: number;
  fullName: string;
  username?: string;
  totalFocusMinutes: number;
  isPremium?: boolean;
  avatarUrl?: string;
};

type CurrentUser = {
  id: number;
  fullName?: string;
  avatarUrl?: string;
};

const focusIdeas = [
  { icon: 'clock', title: '25 dakikalik sprint', text: 'Kisa bir pomodoro ile basla.' },
  { icon: 'book-open', title: 'Sessiz okuma', text: 'Sakin odalari tercih et.' },
  { icon: 'users', title: 'Birlikte calisma', text: 'Aktif odalarda tempo yakala.' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState<Lobby[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExploreData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : await getAuthHeaders();
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }

      const [lobbyRes, leaderRes, meRes] = await Promise.all([
        fetch(apiUrl('/lobbies'), { headers }),
        fetch(apiUrl('/users/leaderboard'), { headers }),
        fetch(apiUrl('/users/me'), { headers }),
      ]);

      if (!lobbyRes.ok || !leaderRes.ok) {
        throw new Error('Kesif verisi alinamadi.');
      }

      const lobbyData = await lobbyRes.json();
      const leaderData = await leaderRes.json();
      const meData = meRes.ok ? await meRes.json() : null;
      setRooms(Array.isArray(lobbyData) ? lobbyData : []);
      setLeaders(Array.isArray(leaderData) ? leaderData.slice(0, 5) : []);
      if (meData?.user) {
        setCurrentUser(meData.user);
        await AsyncStorage.setItem('user_data', JSON.stringify(meData.user));
      }
    } catch {
      setError('Kesif akisi yuklenemedi.');
      setRooms([]);
      setLeaders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExploreData();
    }, [fetchExploreData]),
  );

  const popularRooms = useMemo(() => {
    return [...rooms]
      .sort((a, b) => (b.activeUsers ?? 0) - (a.activeUsers ?? 0))
      .filter((room) => room.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [rooms, query]);

  const openLobbies = () => {
    router.push({ pathname: '/lobbies' as any, params: { ...params } });
  };
  const currentAvatar = assetUrl(currentUser?.avatarUrl);

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>Bugun ne calisiyoruz?</Text>
          <Text style={styles.title}>Kesfet</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/profile', params: { id: currentUser?.id ?? params.id } } as any)}
          activeOpacity={0.75}
          style={styles.profileButton}
        >
          {currentAvatar ? (
            <Image source={{ uri: currentAvatar }} style={styles.profileImage} />
          ) : (
            <FontAwesome5 solid name="user-circle" size={18} color={T.primary} />
          )}
        </TouchableOpacity>
      </View>

      <SearchInput value={query} onChangeText={setQuery} placeholder="Oda ara..." />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.primary} />
          <Text style={styles.muted}>Kesif akisi hazirlaniyor.</Text>
        </View>
      ) : error ? (
        <SoftCard style={styles.stateCard}>
          <FontAwesome5 solid name="wifi" size={22} color={T.danger} />
          <Text style={styles.stateTitle}>{error}</Text>
          <TouchableOpacity onPress={fetchExploreData} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Tekrar dene</Text>
          </TouchableOpacity>
        </SoftCard>
      ) : (
        <FlatList
          data={popularRooms}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <SectionTitle title="Populer odalar" value={`${popularRooms.length} oda`} />
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.88} onPress={openLobbies}>
              <SoftCard style={styles.roomCard}>
                <View style={[styles.iconBox, item.isPremiumOnly && styles.eliteIcon]}>
                  <FontAwesome5
                    solid
                    name={item.isPremiumOnly ? 'crown' : item.isPrivate ? 'lock' : item.icon || 'users'}
                    size={17}
                    color={item.isPremiumOnly ? T.accent : T.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.roomDesc} numberOfLines={1}>
                    {item.description || 'Odak icin hazir bir calisma odasi.'}
                  </Text>
                  <Text style={styles.roomMeta}>{item.activeUsers ?? 0} kisi odaklaniyor</Text>
                </View>
                <FontAwesome5 solid name="chevron-right" size={12} color={T.primary} />
              </SoftCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <SoftCard style={styles.stateCard}>
              <FontAwesome5 solid name="compass" size={24} color={T.textMuted} />
              <Text style={styles.stateTitle}>Sonuc bulunamadi</Text>
              <Text style={styles.muted}>Farkli bir oda adi dene.</Text>
            </SoftCard>
          }
          ListFooterComponent={
            <View style={styles.footerSections}>
              <SectionTitle title="Haftalik liderler" value={`${leaders.length} kisi`} />
              {leaders.map((leader, index) => (
                <SoftCard key={leader.id} style={styles.leaderRow}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  {leader.avatarUrl ? (
                    <Image source={{ uri: assetUrl(leader.avatarUrl) ?? undefined }} style={styles.leaderAvatar} />
                  ) : (
                    <View style={styles.leaderAvatarFallback}>
                      <Text style={styles.leaderAvatarText}>{leader.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.roomName} numberOfLines={1}>
                      {leader.fullName} {leader.isPremium ? 'PRO' : ''}
                    </Text>
                    <Text style={styles.roomMeta}>{leader.totalFocusMinutes} odak puani</Text>
                  </View>
                  <FontAwesome5 solid name={index === 0 ? 'crown' : 'medal'} size={15} color={index === 0 ? T.accent : T.primary} />
                </SoftCard>
              ))}

              <SectionTitle title="Odak onerileri" value="3 fikir" />
              {focusIdeas.map((idea) => (
                <SoftCard key={idea.title} style={styles.ideaCard}>
                  <View style={styles.iconBox}>
                    <FontAwesome5 solid name={idea.icon} size={16} color={T.primary} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.roomName}>{idea.title}</Text>
                    <Text style={styles.roomDesc}>{idea.text}</Text>
                  </View>
                </SoftCard>
              ))}
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </AppScreen>
  );
}

function SectionTitle({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      <Text style={styles.sectionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 18 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: { width: '100%', height: '100%' },
  eyebrow: { fontSize: 13, color: T.textMuted, fontWeight: '700' },
  title: { fontSize: 32, color: T.textDark, fontWeight: '900', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: T.textMuted, fontSize: 13, fontWeight: '600' },
  list: { paddingBottom: 110, gap: 12 },
  sectionTitle: {
    marginTop: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionText: { fontSize: 15, color: T.textDark, fontWeight: '900' },
  sectionValue: { fontSize: 12, color: T.textMuted, fontWeight: '700' },
  roomCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  leaderAvatar: { width: 42, height: 42, borderRadius: 21 },
  leaderAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.softIndigo,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: { color: T.primary, fontSize: 16, fontWeight: '900' },
  ideaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: T.softIndigo,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eliteIcon: { backgroundColor: T.lightAmber, borderColor: T.accent },
  cardBody: { flex: 1 },
  roomName: { color: T.textDark, fontSize: 16, fontWeight: '900' },
  roomDesc: { color: T.textMuted, fontSize: 13, marginTop: 3 },
  roomMeta: { color: T.primary, fontSize: 12, fontWeight: '800', marginTop: 6 },
  rank: { width: 30, color: T.primary, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  footerSections: { gap: 12, marginTop: 14 },
  stateCard: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  stateTitle: { color: T.textDark, fontWeight: '900', fontSize: 17, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
});
