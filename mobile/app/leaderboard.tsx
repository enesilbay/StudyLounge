import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const COLORS = {
  deepIndigo: '#1A237E',
  amberGold: '#FFC107',
  background: '#F8F9FA',
  card: '#FFFFFF',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  textMuted: '#6B7280'
};

const BACKEND_URL = 'http://192.168.1.5:3000';

export default function LeaderboardScreen() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/users/leaderboard`);
        const data = await response.json();
        setLeaders(data);
      } catch (error) {
        console.error("Tablo yüklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankStyle = (index: number) => {
    if (index === 0) return { color: COLORS.amberGold, icon: 'medal' };
    if (index === 1) return { color: COLORS.silver, icon: 'medal' };
    if (index === 2) return { color: COLORS.bronze, icon: 'medal' };
    return { color: COLORS.deepIndigo, icon: 'hashtag' };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.deepIndigo} />
        </TouchableOpacity>
        <Text style={styles.title}>Günün Çalışkanları</Text>
        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.amberGold} />
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => {
            const rank = getRankStyle(index);
            const isTop3 = index < 3;
            
            return (
              <View style={[styles.card, isTop3 ? styles.topCard : {}]}>
                
                <View style={styles.rankContainer}>
                  <FontAwesome5 name={rank.icon} size={20} color={rank.color} />
                  {!isTop3 ? (
                    <Text style={styles.rankText}>{String(index + 1)}</Text>
                  ) : null}
                </View>

                {/* 👇 YENİ: AVATAR KISMI EKLENDİ 👇 */}
                <View style={styles.avatarContainer}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: `${BACKEND_URL}${item.avatarUrl}` }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>
                      {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  )}
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, isTop3 ? { fontWeight: '900' } : {}]}>
                    {item.fullName} {item.isPremium ? '✨' : ''}
                  </Text>
                  <Text style={styles.scoreText}>
                    {String(item.totalFocusMinutes)} Puan
                  </Text>
                </View>
                
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 20 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.deepIndigo },
  spacer: { width: 40 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
  topCard: { borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.3)', backgroundColor: '#FFFAF0' },
  rankContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepIndigo, marginTop: 4 },
  
  // YENİ AVATAR STİLLERİ
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    marginRight: 15,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.amberGold,
  },

  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4 },
  scoreText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' }
});