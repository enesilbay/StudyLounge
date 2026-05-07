import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { C } from './(tabs)/sensor';

const BACKEND_URL = 'http://10.192.24.96:3000';
const { width, height } = Dimensions.get('window');

// ── DEKORATIF ARKAPLAN NOKTALARI ──
function BackgroundOrbs() {
  return (
    <>
      <View style={bg.orb1} />
      <View style={bg.orb2} />
      <View style={bg.orb3} />
      <View style={bg.gridLine1} />
      <View style={bg.gridLine2} />
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={16} color="rgba(255,255,255,0.7)" />
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
                {isTop3 && (
                  <LinearGradient colors={['rgba(255,193,7,0.1)', 'transparent']} style={StyleSheet.absoluteFillObject} />
                )}
                
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
                  <Text style={[
                    styles.userName, 
                    isTop3 ? { fontWeight: '900' } : {},
                    item.isPremium ? { 
                      color: C.primary, 
                      textShadowColor: 'rgba(255, 193, 7, 0.4)', 
                      textShadowOffset: { width: 0, height: 2 }, 
                      textShadowRadius: 8 
                    } : {}
                  ]}>
                    {item.fullName} {item.isPremium ? '✨' : ''}
                  </Text>
                  <Text style={styles.scoreText}>
                    {String(item.totalFocusMinutes)} <Text style={{ fontSize: 11 }}>Puan</Text>
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
  safeArea: { flex: 1, backgroundColor: '#080C14' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  title: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  spacer: { width: 42 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 22, paddingBottom: 30 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  topCard: { borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.3)', backgroundColor: 'rgba(255, 193, 7, 0.05)' },
  rankContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '900',
    color: C.primary,
  },

  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  scoreText: { fontSize: 14, color: C.primary, fontWeight: '700' }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, left: -width * 0.2, width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, backgroundColor: 'rgba(255,193,7,0.06)' },
  orb2: { position: 'absolute', bottom: height * 0.05, right: -width * 0.3, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(99,102,241,0.05)' },
  orb3: { position: 'absolute', top: height * 0.4, left: width * 0.1, width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15, backgroundColor: 'rgba(255,193,7,0.04)' },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});
