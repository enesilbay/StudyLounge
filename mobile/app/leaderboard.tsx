import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

import { C } from './(tabs)/sensor';

const BACKEND_URL = 'http://10.192.24.96:3000';

export default function LeaderboardScreen() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const response = await fetch(`${BACKEND_URL}/users/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setLeaders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Tablo yüklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankStyle = (index: number) => {
    if (index === 0) return { color: C.primary, icon: 'medal' };
    if (index === 1) return { color: '#C0C0C0', icon: 'medal' };
    if (index === 2) return { color: '#CD7F32', icon: 'medal' };
    return { color: C.textMuted, icon: 'hashtag' };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Liderlik Tablosu</Text>
        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => {
            const isTop3 = index < 3;
            
            return (
              <View style={[styles.card, isTop3 ? styles.topCard : {}]}>
                
                <View style={styles.rankContainer}>
                    {index === 0 && <FontAwesome5 name="crown" size={24} color={C.primary} />}
                    {index === 1 && <FontAwesome5 name="medal" size={24} color="#C0C0C0" />}
                    {index === 2 && <FontAwesome5 name="medal" size={24} color="#CD7F32" />}
                    {index > 2 && <Text style={styles.rankText}>{index + 1}</Text>}
                </View>

                {/* ── AVATAR KISMI ── */}
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
                  {/* 👇 YENİ: PREMIUM İSE ALTIN RENGİ VE PARLAMA EFEKTİ EKLENDİ 👇 */}
                  <Text style={[
                    styles.userName, 
                    isTop3 ? { fontWeight: '900' } : {},
                    item.isPremium ? { 
                      color: '#FFD700', 
                      textShadowColor: 'rgba(255, 215, 0, 0.6)', 
                      textShadowOffset: { width: 0, height: 0 }, 
                      textShadowRadius: 8 
                    } : {}
                  ]}>
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
  safeArea: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  title: { fontSize: 22, fontWeight: '900', color: C.text },
  spacer: { width: 40 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  topCard: { borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.5)', backgroundColor: 'rgba(255, 193, 7, 0.05)' },
  rankContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 16, fontWeight: 'bold', color: C.textMuted, marginTop: 4 },
  
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
    color: C.primary,
  },

  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  scoreText: { fontSize: 14, color: C.textMuted, fontWeight: '600' }
});
