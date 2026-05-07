import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Image, Alert, ActivityIndicator, Dimensions, Platform // 👈 Platform eklendi
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = 'http://192.168.1.17:3000';
const { width } = Dimensions.get('window');

const C = {
  bg: '#0F172A',
  cardBg: '#1E293B',
  primary: '#FFC107',
  primaryDark: '#F59E0B',
  secondary: '#1A237E',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── Sayfaya her girildiğinde kullanıcı bilgilerini taze çek ──
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [myUserId])
  );

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/users/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allUsers = await res.json();
      if (Array.isArray(allUsers)) {
        const me = allUsers.find((u: any) => u.id === myUserId);
        if (me) {
          setUser(me);
          return;
        }
      }
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      console.error('Kullanıcı bilgisi çekilemedi', e);
    }
  };

  // ── 📸 GALERİDEN FOTOĞRAF SEÇME VE YÜKLEME ──
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri erişimine izin vermelisin.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      // 👇 DÜZELTME 1: Platforma göre URI ayarı 👇
      const fileUri = Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', '');

      formData.append('file', {
        uri: fileUri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      // 👇 DÜZELTME 2: Authorization header eklendi 👇
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/users/avatar/${myUserId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        const stored = await AsyncStorage.getItem('user_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.avatarUrl = data.user.avatarUrl;
          await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
        }
      } else {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
      }
    } catch (error) {
      console.error('Yükleme Hatası:', error);
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return <View style={s.safe} />;

  const fullAvatarUrl = user.avatarUrl ? `${BACKEND_URL}${user.avatarUrl}` : null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profilim</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.container}>
        
        {/* ── AVATAR BÖLÜMÜ ── */}
        <View style={s.avatarWrap}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
            <View style={s.avatarContainer}>
              {fullAvatarUrl ? (
                <Image source={{ uri: fullAvatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarInitials}>{user.fullName?.charAt(0) || 'U'}</Text>
              )}

              <View style={s.editBadge}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <FontAwesome5 name="camera" size={14} color={C.white} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── KULLANICI BİLGİLERİ ── */}
        <View style={s.infoWrap}>
          <Text style={s.name}>{user.fullName}</Text>
          <Text style={s.username}>@{user.username || 'ogrenci'}</Text>
        </View>

        {/* ── İSTATİSTİKLER ── */}
        <View style={s.statsCard}>
          <LinearGradient colors={['rgba(255, 193, 7, 0.1)', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={s.statItem}>
            <FontAwesome5 name="fire" size={24} color="#EF4444" />
            <Text style={s.statValue}>{user.totalFocusMinutes || 0}</Text>
            <Text style={s.statLabel}>Dakika Odaklanma</Text>
          </View>
          
          {/* 👇 YENİ: ANALİTİK BUTONU (SADECE PRO) 👇 */}
          <TouchableOpacity 
            style={{ marginTop: 25, width: '100%' }}
            activeOpacity={0.8}
            onPress={() => {
              if (user.isPremium) {
                router.push('/analytics' as any);
              } else {
                router.push({ pathname: '/premium', params: { id: myUserId } } as any);
              }
            }}
          >
            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <FontAwesome5 name={user.isPremium ? "chart-pie" : "lock"} size={16} color={C.primary} />
              <Text style={{ color: C.white, fontWeight: 'bold' }}>Detaylı Analitik (PRO)</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.white },
  container: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  
  avatarWrap: { marginTop: 30, marginBottom: 20 },
  avatarContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255, 193, 7, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.primary, position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 70 },
  avatarInitials: { fontSize: 50, fontWeight: 'bold', color: C.primary },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: C.primaryDark, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg },
  
  infoWrap: { alignItems: 'center', marginBottom: 40 },
  name: { fontSize: 26, fontWeight: 'bold', color: C.white, marginBottom: 5 },
  username: { fontSize: 16, color: C.textMuted },
  
  statsCard: { width: '100%', backgroundColor: C.cardBg, borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statItem: { alignItems: 'center', gap: 8 },
  statValue: { fontSize: 32, fontWeight: '900', color: C.white },
  statLabel: { fontSize: 14, color: C.textMuted, fontWeight: '600' }
});
