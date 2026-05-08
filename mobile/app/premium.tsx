import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function PremiumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id);
  
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/users/upgrade/${myUserId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const stored = await AsyncStorage.getItem('user_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.isPremium = true;
          await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
        }
        
        Alert.alert(
          'Tebrikler! 🎉',
          'Artık Premium üyesiniz. İsminiz liderlik tablosunda altın renginde parlayacak!',
          [{ text: 'Harika!', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Hata', 'İşlem tamamlanamadı.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="times" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Taç İkonu */}
        <View style={s.crownContainer}>
          <LinearGradient colors={['rgba(255,193,7,0.2)', 'rgba(255,193,7,0.05)']} style={[StyleSheet.absoluteFill, { borderRadius: 60 }]} />
          <View style={s.crownInner}>
            <FontAwesome5 name="crown" size={40} color={C.primary} />
          </View>
        </View>

        <Text style={s.title}>StudyLounge <Text style={{ color: C.primary }}>PRO</Text></Text>
        <Text style={s.subtitle}>Çalışma deneyimini bir üst seviyeye taşı.</Text>

        {/* Avantajlar Listesi */}
        <View style={s.featuresBox}>
          <FeatureItem icon="users" title="Çoklu Grup Odaları" desc="5 kişiye kadar arkadaş grubunla aynı masada çalış." />
          <FeatureItem icon="globe" title="Global Study Lounges" desc="Aynı dersi çalışan yabancılarla sınırsız mesajlaşma." />
          <FeatureItem icon="chart-bar" title="Detaylı Analitik" desc="Haftalık/Aylık verimlilik grafikleri ve odaklanma puanı." />
          <FeatureItem icon="medal" title="Profil Rozetleri" desc="Kaç aylık premium olduğuna göre değişen profil rozetleri." />
          <FeatureItem icon="star" title="Ek Avantajlar" desc="Reklamsız deneyim, sınırsız PDF ve Not paylaşımı." />
        </View>
      </ScrollView>

      {/* Satın Alma Butonu */}
      <View style={s.footer}>
        <TouchableOpacity onPress={handlePurchase} disabled={isLoading} activeOpacity={0.85}>
          <LinearGradient colors={[C.primary, '#E6A800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.buyBtn}>
            {isLoading ? (
              <ActivityIndicator color="#1A0F00" />
            ) : (
              <Text style={s.buyBtnText}>PRO&apos;YA YÜKSELT</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={s.disclaimer}>Geliştirme aşamasında olduğu için şimdilik ücretsizdir.</Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <View style={s.featureItem}>
      <View style={s.featureIconBox}>
        <FontAwesome5 name={icon} size={16} color={C.primary} />
      </View>
      <View style={s.featureTextWrap}>
        <Text style={s.featureTitle}>{title}</Text>
        <Text style={s.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080C14' },
  header: { padding: 22, alignItems: 'flex-end' },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  
  container: { alignItems: 'center', paddingHorizontal: 25, paddingBottom: 20 },
  crownContainer: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)', borderRadius: 50 },
  crownInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,193,7,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
  
  title: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 35 },
  
  featuresBox: { width: '100%', gap: 14 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
  featureIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,193,7,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  
  footer: { padding: 25, paddingBottom: 40 },
  buyBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  buyBtnText: { fontSize: 16, fontWeight: '900', color: '#1A0F00', letterSpacing: 1.5 },
  disclaimer: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 15 }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, left: -width * 0.2, width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, backgroundColor: 'rgba(255,193,7,0.06)' },
  orb2: { position: 'absolute', bottom: height * 0.05, right: -width * 0.3, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(99,102,241,0.05)' },
  orb3: { position: 'absolute', top: height * 0.4, left: width * 0.1, width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15, backgroundColor: 'rgba(255,193,7,0.04)' },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});
