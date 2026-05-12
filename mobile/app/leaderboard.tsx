import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiUrl, assetUrl } from './config/api';
import { getRankInfo } from './utils/rank';
import { Theme } from './utils/theme';

const { width, height } = Dimensions.get('window');
const T = Theme.colors;

// ── DEKORATIF ARKAPLAN NOKTALARI ──
function BackgroundOrbs() {
  return (
    <>
      <View style={bg.orb1} />
      <View style={bg.orb2} />
      <View style={bg.orb3} />
    </>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const response = await fetch(apiUrl('/users/leaderboard'), {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={16} color={T.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Liderlik Tablosu</Text>
        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={T.primary} />
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
                    {index === 0 && <FontAwesome5 name="crown" size={24} color={T.accent} />}
                    {index === 1 && <FontAwesome5 name="medal" size={24} color="#C0C0C0" />}
                    {index === 2 && <FontAwesome5 name="medal" size={24} color="#CD7F32" />}
                    {index > 2 && <Text style={styles.rankText}>{index + 1}</Text>}
                </View>

                {/* ── AVATAR KISMI ── */}
                <View style={styles.avatarContainer}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: assetUrl(item.avatarUrl) ?? undefined }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>
                      {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  )}
                </View>

                <View style={styles.userInfo}>
                  <Text style={[
                    styles.userName, 
                    isTop3 ? { fontWeight: '900' } : {},
                    item.isPremium ? { 
                      color: T.accent, 
                      textShadowColor: 'rgba(255, 193, 7, 0.4)', 
                      textShadowOffset: { width: 0, height: 2 }, 
                      textShadowRadius: 8 
                    } : {}
                  ]}>
                    {item.fullName} {item.isPremium && <FontAwesome5 solid name="crown" size={14} color={T.accent} />}
                  </Text>
                  <Text style={styles.scoreText}>
                    {String(item.totalFocusMinutes)} <Text style={{ fontSize: 11 }}>Puan</Text>
                  </Text>
                </View>

                {/* RÜTBE ROZETİ */}
                <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: `${getRankInfo(item.totalFocusMinutes).color}15`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: `${getRankInfo(item.totalFocusMinutes).color}30` }}>
                  <FontAwesome5 name={getRankInfo(item.totalFocusMinutes).icon} size={14} color={getRankInfo(item.totalFocusMinutes).color} solid />
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: getRankInfo(item.totalFocusMinutes).color, marginTop: 2 }}>{getRankInfo(item.totalFocusMinutes).title}</Text>
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
  safeArea: { flex: 1, backgroundColor: T.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  title: { fontSize: 20, fontWeight: '900', color: T.textDark, letterSpacing: 0.5 },
  spacer: { width: 42 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 22, paddingBottom: 30 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft, overflow: 'hidden' },
  topCard: { borderWidth: 1, borderColor: T.accent, backgroundColor: T.lightAmber },
  rankContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 18, fontWeight: '800', color: T.textMuted, marginTop: 2 },
  
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.softIndigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 16,
    borderWidth: 1,
    borderColor: T.border
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '900',
    color: T.primary,
  },

  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '800', color: T.textDark, marginBottom: 4 },
  scoreText: { fontSize: 14, color: T.accent, fontWeight: '700' }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: T.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: T.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: T.softInfo, opacity: 0.45 },
});
