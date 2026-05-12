import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiUrl, assetUrl } from './config/api';
import { AppScreen, PageHeader, SoftCard } from './components/common';
import { C } from './(tabs)/sensor';
import { getRankInfo } from './utils/rank';

const T = C;

type Leader = {
  id: number;
  fullName: string;
  username?: string;
  totalFocusMinutes: number;
  avatarUrl?: string;
  isPremium?: boolean;
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(apiUrl('/users/leaderboard'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Liderlik alinamadi.');
      }
      const data = await response.json();
      setLeaders(Array.isArray(data) ? data : []);
    } catch {
      setError('Liderlik tablosu yuklenemedi.');
      setLeaders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <AppScreen>
      <PageHeader title="Liderlik" eyebrow="Haftanin odak siralamasi" onBack={() => router.back()} />

      {isLoading ? (
        <SoftCard style={styles.stateCard}>
          <ActivityIndicator color={T.primary} />
          <Text style={styles.muted}>Tablo hazirlaniyor.</Text>
        </SoftCard>
      ) : error ? (
        <SoftCard style={styles.stateCard}>
          <FontAwesome5 solid name="trophy" size={24} color={T.danger} />
          <Text style={styles.stateTitle}>{error}</Text>
        </SoftCard>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <SoftCard style={styles.stateCard}>
              <FontAwesome5 solid name="medal" size={24} color={T.textMuted} />
              <Text style={styles.stateTitle}>Henuz siralama yok</Text>
              <Text style={styles.muted}>Odak puanlari biriktikce burada gorunecek.</Text>
            </SoftCard>
          }
          renderItem={({ item, index }) => {
            const rank = getRankInfo(item.totalFocusMinutes);
            const isTop = index < 3;
            return (
              <SoftCard style={[styles.row, isTop && styles.topRow]}>
                <View style={styles.rankBox}>
                  {index === 0 ? (
                    <FontAwesome5 solid name="crown" size={22} color={T.accent} />
                  ) : index < 3 ? (
                    <FontAwesome5 solid name="medal" size={21} color={index === 1 ? '#94A3B8' : '#B45309'} />
                  ) : (
                    <Text style={styles.rankText}>{index + 1}</Text>
                  )}
                </View>

                <View style={styles.avatar}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: assetUrl(item.avatarUrl) ?? undefined }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{item.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                  )}
                </View>

                <View style={styles.body}>
                  <Text style={[styles.name, item.isPremium && styles.premiumName]} numberOfLines={1}>
                    {item.fullName} {item.isPremium ? 'PRO' : ''}
                  </Text>
                  <Text style={styles.score}>{item.totalFocusMinutes} odak puani</Text>
                </View>

                <View style={[styles.badge, { backgroundColor: `${rank.color}16`, borderColor: `${rank.color}40` }]}>
                  <FontAwesome5 solid name={rank.icon} size={13} color={rank.color} />
                  <Text style={[styles.badgeText, { color: rank.color }]}>{rank.title}</Text>
                </View>
              </SoftCard>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 110 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  topRow: { backgroundColor: T.lightAmber, borderColor: T.accent },
  rankBox: { width: 34, alignItems: 'center' },
  rankText: { color: T.textMuted, fontSize: 18, fontWeight: '900' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.softIndigo,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 24 },
  avatarText: { color: T.primary, fontSize: 20, fontWeight: '900' },
  body: { flex: 1 },
  name: { color: T.textDark, fontSize: 16, fontWeight: '900' },
  premiumName: { color: T.accent },
  score: { color: T.textMuted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  badge: { minWidth: 74, alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 7 },
  badgeText: { fontSize: 10, fontWeight: '900', marginTop: 2 },
  stateCard: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  stateTitle: { color: T.textDark, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  muted: { color: T.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
