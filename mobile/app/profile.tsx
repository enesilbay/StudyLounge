import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Image, Alert, ActivityIndicator, Dimensions, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { C } from './(tabs)/sensor';
import { getRankInfo, getRankProgress } from './utils/rank';

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

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

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
      
      const fileUri = Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', '');

      formData.append('file', {
        uri: fileUri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

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
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="arrow-left" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profilim</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)} style={s.infoBtn}>
          <FontAwesome5 name="info" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <View style={s.container}>
        
        {/* ── AVATAR BÖLÜMÜ ── */}
        <View style={s.avatarWrap}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
            <View style={s.avatarContainer}>
              <LinearGradient colors={['rgba(255,193,7,0.2)', 'rgba(255,193,7,0.05)']} style={[StyleSheet.absoluteFill, { borderRadius: 80 }]} />
              {fullAvatarUrl ? (
                <Image source={{ uri: fullAvatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarInitials}>{user.fullName?.charAt(0) || 'U'}</Text>
              )}

              <View style={s.editBadge}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={C.btnText} />
                ) : (
                  <FontAwesome5 name="camera" size={14} color={C.btnText} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── KULLANICI BİLGİLERİ ── */}
        <View style={s.infoWrap}>
          <Text style={s.name}>{user.fullName} {user.isPremium && <FontAwesome5 solid name="crown" size={18} color={C.primary} />}</Text>
          <Text style={s.username}>@{user.username || 'ogrenci'}</Text>
        </View>

        {/* ── İSTATİSTİKLER VE RÜTBE ── */}
        <View style={s.statsCard}>
          <LinearGradient colors={['rgba(255, 193, 7, 0.05)', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
          
          <View style={s.statItem}>
            <View style={[s.statIconWrap, { backgroundColor: `${getRankInfo(user.totalFocusMinutes).color}20`, borderColor: `${getRankInfo(user.totalFocusMinutes).color}40` }]}>
              <FontAwesome5 name={getRankInfo(user.totalFocusMinutes).icon} size={24} color={getRankInfo(user.totalFocusMinutes).color} solid />
            </View>
            <Text style={[s.statValue, { color: getRankInfo(user.totalFocusMinutes).color }]}>{user.totalFocusMinutes || 0}</Text>
            <Text style={s.statLabel}>Odak Puanı</Text>
          </View>

          {/* PROGRESS BAR */}
          <View style={{ width: '100%', marginTop: 25, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: 13 }}>{getRankInfo(user.totalFocusMinutes).title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {getRankProgress(user.totalFocusMinutes).nextRank 
                  ? `${getRankProgress(user.totalFocusMinutes).current} / ${getRankProgress(user.totalFocusMinutes).total} Sonraki: ${getRankProgress(user.totalFocusMinutes).nextRank}` 
                  : 'Maksimum Seviye'}
              </Text>
            </View>
            <View style={{ width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${getRankProgress(user.totalFocusMinutes).percentage}%`, height: '100%', backgroundColor: getRankInfo(user.totalFocusMinutes).color, borderRadius: 4 }} />
            </View>
          </View>
          
          <TouchableOpacity 
            style={s.analyticsBtnWrap}
            activeOpacity={0.85}
            onPress={() => {
              if (user.isPremium) {
                router.push('/analytics' as any);
              } else {
                router.push({ pathname: '/premium', params: { id: myUserId } } as any);
              }
            }}
          >
            <LinearGradient colors={user.isPremium ? ['rgba(255,193,7,0.15)', 'rgba(255,193,7,0.05)'] : [C.card, 'rgba(255,255,255,0.02)']} style={s.analyticsBtn}>
              <FontAwesome5 name={user.isPremium ? "chart-pie" : "lock"} size={16} color={user.isPremium ? C.primary : 'rgba(255,255,255,0.4)'} />
              <Text style={[s.analyticsText, !user.isPremium && { color: 'rgba(255,255,255,0.4)' }]}>Detaylı Analitik (PRO)</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </View>

      {/* NASIL PUAN KAZANILIR MODAL */}
      {showInfo && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }]}>
          <View style={{ backgroundColor: C.card, padding: 30, borderRadius: 24, width: '85%', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 15, textAlign: 'center' }}>Nasıl Puan Kazanılır? 🏆</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
              <FontAwesome5 name="mobile-alt" size={16} color={C.primary} style={{ marginTop: 2 }} />
              <Text style={{ color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 22 }}>Çalışma odasındayken cihazı masaya ters veya düz bıraktığınızda puan kazanımı başlar.</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
              <FontAwesome5 name="stopwatch" size={16} color={C.success} style={{ marginTop: 2 }} />
              <Text style={{ color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 22 }}>Her <Text style={{fontWeight:'bold', color:C.text}}>1 dakika</Text> odaklanma size <Text style={{fontWeight:'bold', color:C.text}}>1 Puan</Text> kazandırır.</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 25, gap: 10 }}>
              <FontAwesome5 name="crown" size={16} color={C.primary} style={{ marginTop: 2 }} />
              <Text style={{ color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 22 }}><Text style={{fontWeight:'bold', color:C.primary}}>Elite Odalarda</Text> geçirilen her dakika için odak puanları <Text style={{fontWeight:'bold', color:C.primary}}>2 ile çarpılarak</Text> verilir!</Text>
            </View>

            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: C.text, fontWeight: 'bold' }}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  infoBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 1 },
  container: { flex: 1, paddingHorizontal: 25, alignItems: 'center' },
  
  avatarWrap: { marginTop: 30, marginBottom: 25 },
  avatarContainer: { width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 193, 7, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255, 193, 7, 0.3)', position: 'relative' },
  avatarImage: { width: 146, height: 146, borderRadius: 73 },
  avatarInitials: { fontSize: 50, fontWeight: '900', color: C.primary },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: C.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.5, shadowRadius: 5 },
  
  infoWrap: { alignItems: 'center', marginBottom: 40 },
  name: { fontSize: 28, fontWeight: '900', color: C.text, marginBottom: 6, letterSpacing: 0.5 },
  username: { fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  
  statsCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statItem: { alignItems: 'center', gap: 10 },
  statIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  statValue: { fontSize: 36, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: 1 },
  
  analyticsBtnWrap: { marginTop: 35, width: '100%' },
  analyticsBtn: { flexDirection: 'row', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: C.border },
  analyticsText: { color: C.text, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, left: -width * 0.2, width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, backgroundColor: 'rgba(255,193,7,0.06)' },
  orb2: { position: 'absolute', bottom: height * 0.05, right: -width * 0.3, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(99,102,241,0.05)' },
  orb3: { position: 'absolute', top: height * 0.4, left: width * 0.1, width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15, backgroundColor: 'rgba(255,193,7,0.04)' },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});
