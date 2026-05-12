import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from './config/api';
import { C } from './(tabs)/sensor';
import { Theme } from './utils/theme';

const { width, height } = Dimensions.get('window');
const T = C;

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

export default function PremiumScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/demo/upgrade'), {
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
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="times" size={18} color={T.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Taç İkonu */}
        <View style={s.crownContainer}>
          <View style={s.crownInner}>
            <FontAwesome5 name="crown" size={40} color={T.accent} />
          </View>
        </View>

        <Text style={s.title}>StudyLounge <Text style={{ color: T.accent }}>PRO</Text></Text>
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
          <LinearGradient colors={[T.primary, T.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.buyBtn}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
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
        <FontAwesome5 name={icon} size={16} color={T.accent} />
      </View>
      <View style={s.featureTextWrap}>
        <Text style={s.featureTitle}>{title}</Text>
        <Text style={s.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  header: { padding: 22, alignItems: 'flex-end' },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  
  container: { alignItems: 'center', paddingHorizontal: 25, paddingBottom: 20 },
  crownContainer: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 25, borderWidth: 1, borderColor: T.accent, borderRadius: 50, backgroundColor: T.lightAmber },
  crownInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,193,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.accent },
  
  title: { fontSize: 34, fontWeight: '900', color: T.textDark, marginBottom: 8, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: T.textMuted, textAlign: 'center', marginBottom: 35 },
  
  featuresBox: { width: '100%', gap: 14 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  featureIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: T.lightAmber, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: T.accent },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: T.textDark, marginBottom: 4 },
  featureDesc: { fontSize: 13, color: T.textMuted },
  
  footer: { padding: 25, paddingBottom: 40 },
  buyBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: T.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  buyBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  disclaimer: { fontSize: 12, color: T.textMuted, textAlign: 'center', marginTop: 15 }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: T.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: T.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: T.softInfo, opacity: 0.45 },
});
