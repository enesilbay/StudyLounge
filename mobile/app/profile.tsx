import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Marka Renkleri
const COLORS = {
  deepIndigo: '#1A237E',
  amberGold: '#FFC107',
  background: '#F8F9FA',
  card: '#FFFFFF',
  textMuted: '#6B7280'
};

// Şimdilik görselleştirmek için örnek haftalık veri (İleride backend'den gelecek)
const WEEKLY_DATA = [
  { day: 'Pzt', minutes: 45 },
  { day: 'Sal', minutes: 120 },
  { day: 'Çar', minutes: 80 },
  { day: 'Per', minutes: 150 },
  { day: 'Cum', minutes: 90 },
  { day: 'Cmt', minutes: 200 },
  { day: 'Paz', minutes: 60 },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const storedData = await AsyncStorage.getItem('user_data');
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    };
    loadUser();
  }, []);

  if (!userData) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={COLORS.deepIndigo} />
      </View>
    );
  }

  // Grafik yüksekliğini hesaplamak için en yüksek değeri bul
  const maxVal = Math.max(...WEEKLY_DATA.map(d => d.minutes));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.deepIndigo} />
        </TouchableOpacity>
        <Text style={styles.title}>Profilim</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Kullanıcı Bilgi Kartı */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <FontAwesome5 name="user-graduate" size={40} color={COLORS.amberGold} />
          </View>
          <Text style={styles.userName}>{userData.fullName}</Text>
          <Text style={styles.userLevel}>
            {userData.score > 500 ? '🔥 Kıdemli Çalışkan' : '🌱 Çaylak Odaklayıcı'}
          </Text>
        </View>

        {/* İstatistik Özetleri */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <FontAwesome5 name="fire" size={24} color="#FF5722" />
            <Text style={styles.statValue}>{userData.score}</Text>
            <Text style={styles.statLabel}>Toplam Puan</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome5 name="clock" size={24} color={COLORS.deepIndigo} />
            <Text style={styles.statValue}>{Math.floor(userData.score / 60)}s</Text>
            <Text style={styles.statLabel}>Toplam Saat</Text>
          </View>
        </View>

        {/* Haftalık Analitik Grafiği (Custom Bar Chart) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Haftalık Odaklanma (Dk)</Text>
          <View style={styles.chartContainer}>
            {WEEKLY_DATA.map((item, index) => {
              const barHeight = (item.minutes / maxVal) * 100; // Yüzdelik olarak bar boyu
              const isToday = item.day === 'Per'; // Örnek olarak Perşembe bugün olsun
              
              return (
                <View key={index} style={styles.barWrapper}>
                  <Text style={styles.barValue}>{item.minutes}</Text>
                  <View style={styles.barBackground}>
                    <View style={[
                      styles.barFill, 
                      { height: `${barHeight}%`, backgroundColor: isToday ? COLORS.amberGold : COLORS.deepIndigo }
                    ]} />
                  </View>
                  <Text style={[styles.barLabel, isToday ? { fontWeight: 'bold', color: COLORS.deepIndigo } : {}]}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
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
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  
  // Profil Kartı
  profileCard: { backgroundColor: COLORS.deepIndigo, borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 20, elevation: 5 },
  avatarContainer: { width: 80, height: 80, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  userLevel: { fontSize: 14, color: COLORS.amberGold, fontWeight: '600' },

  // İstatistikler
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: 15, padding: 20, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.deepIndigo, marginTop: 10 },
  statLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  // Grafik Kartı
  chartCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepIndigo, marginBottom: 20 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180 },
  barWrapper: { alignItems: 'center', width: 35 },
  barValue: { fontSize: 10, color: COLORS.textMuted, marginBottom: 5 },
  barBackground: { width: 12, height: 120, backgroundColor: '#F3F4F6', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 }
});