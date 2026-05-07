import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'http://192.168.1.17:3000'; // IP adresinin doğru olduğundan emin ol!
const { width } = Dimensions.get('window');

const C = {
  bg: '#0F172A',
  cardBg: '#1E293B',
  gold: '#FFD700',
  goldDark: '#F59E0B',
  white: '#FFFFFF',
  textMuted: '#94A3B8',
};

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
      const data = await res.json();

      if (res.ok) {
        // Telefona da Premium olduğunu kaydet
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
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="times" size={20} color={C.white} />
        </TouchableOpacity>
      </View>

      <View style={s.container}>
        {/* Taç İkonu */}
        <View style={s.crownContainer}>
         <LinearGradient colors={['rgba(255, 215, 0, 0.2)', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: 60 }]} />
          <FontAwesome5 name="crown" size={60} color={C.gold} />
        </View>

        <Text style={s.title}>StudyLounge <Text style={{ color: C.gold }}>PRO</Text></Text>
        <Text style={s.subtitle}>Çalışma deneyimini bir üst seviyeye taşı.</Text>

     {/* Avantajlar Listesi */}
        <View style={s.featuresBox}>
          <FeatureItem icon="users" title="Çoklu Grup Odaları" desc="5 kişiye kadar arkadaş grubunla aynı masada çalış." />
          <FeatureItem icon="globe" title="Global Study Lounges" desc="Aynı dersi çalışan yabancılarla sınırsız mesajlaşma." />
          <FeatureItem icon="chart-bar" title="Detaylı Analitik" desc="Haftalık/Aylık verimlilik grafikleri ve odaklanma puanı." />
          <FeatureItem icon="medal" title="Profil Rozetleri" desc="Kaç aylık premium olduğuna göre değişen profil rozetleri." />
          <FeatureItem icon="star" title="Ek Avantajlar" desc="Reklamsız deneyim, sınırsız PDF ve Not paylaşımı." />
        </View>
      </View>

      {/* Satın Alma Butonu */}
      <View style={s.footer}>
        <TouchableOpacity onPress={handlePurchase} disabled={isLoading} activeOpacity={0.8}>
          <LinearGradient colors={[C.gold, C.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.buyBtn}>
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.buyBtnText}>PRO'YA YÜKSELT (ÜCRETSİZ DENEME)</Text>
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
        <FontAwesome5 name={icon} size={18} color={C.gold} />
      </View>
      <View style={s.featureTextWrap}>
        <Text style={s.featureTitle}>{title}</Text>
        <Text style={s.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, alignItems: 'flex-end' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 25, marginTop: 10 },
  crownContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: C.white, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: C.textMuted, textAlign: 'center', marginBottom: 40 },
  
  featuresBox: { width: '100%', gap: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' },
  featureIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 215, 0, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: 'bold', color: C.white, marginBottom: 4 },
  featureDesc: { fontSize: 13, color: C.textMuted },
  
  footer: { padding: 25, paddingBottom: 40 },
  buyBtn: { height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  buyBtnText: { fontSize: 16, fontWeight: '900', color: '#000', letterSpacing: 1 },
  disclaimer: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 15 }
});
