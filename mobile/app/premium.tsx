import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { apiUrl } from './config/api';
import { AppScreen, PageHeader, SoftCard } from './components/common';
import { C } from './(tabs)/sensor';
import { Theme } from './utils/theme';

const T = C;

const benefits = [
  { icon: 'crown', title: 'Elite odalar', text: 'Premium odalara gir ve odak puanini ikiye katla.' },
  { icon: 'users', title: 'Daha kalabalik gruplar', text: 'Gizli odalarda 5 kisiye kadar birlikte calis.' },
  { icon: 'chart-pie', title: 'Detayli analitik', text: 'Haftalik grafikler ve verimli saatlerini gor.' },
  { icon: 'file-upload', title: 'Paylasim rahatligi', text: 'Not, PDF ve gorsel paylasimlarini daha temiz yonet.' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoUpgrade = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/demo/upgrade'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Demo premium aktif edilemedi.');
      }

      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.isPremium = true;
        await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
      }

      Alert.alert('Premium aktif', 'Demo premium hesabina tanimlandi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Hata', 'Demo premium islemi tamamlanamadi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppScreen scroll>
      <PageHeader title="StudyLounge PRO" eyebrow="Premium calisma deneyimi" onBack={() => router.back()} />

      <View style={styles.hero}>
        <View style={styles.crown}>
          <FontAwesome5 solid name="crown" size={34} color={T.accent} />
        </View>
        <Text style={styles.title}>Odak oturumlarini daha guclu yonet.</Text>
        <Text style={styles.subtitle}>Elite odalar, analitik ve daha esnek grup calismasi tek pakette.</Text>
      </View>

      <View style={styles.features}>
        {benefits.map((item) => (
          <SoftCard key={item.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <FontAwesome5 solid name={item.icon} size={16} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          </SoftCard>
        ))}
      </View>

      <SoftCard style={styles.demoBox}>
        <Text style={styles.demoLabel}>Demo modu</Text>
        <Text style={styles.demoText}>
          Gercek odeme entegrasyonu sonraki asamada eklenecek. Bu buton yalnizca teslim/demoda premium ozelliklerini acmak icin kullanilir.
        </Text>
      </SoftCard>

      <TouchableOpacity onPress={handleDemoUpgrade} disabled={isLoading} activeOpacity={0.86}>
        <LinearGradient colors={[T.primary, T.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome5 solid name="bolt" size={14} color="#FFFFFF" />
              <Text style={styles.buttonText}>DEMO PREMIUM AKTIF ET</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 10, marginBottom: 24 },
  crown: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: T.lightAmber,
    borderWidth: 1,
    borderColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...Theme.shadows.soft,
  },
  title: { color: T.textDark, fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 34 },
  subtitle: { color: T.textMuted, fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22, marginTop: 10 },
  features: { gap: 12, marginBottom: 16 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: T.lightAmber, borderWidth: 1, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: T.textDark, fontSize: 16, fontWeight: '900' },
  featureText: { color: T.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 3 },
  demoBox: { backgroundColor: T.softInfo, marginBottom: 18 },
  demoLabel: { color: T.info, fontSize: 13, fontWeight: '900', marginBottom: 6 },
  demoText: { color: T.textDark, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  button: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginBottom: 34, ...Theme.shadows.medium },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
});
