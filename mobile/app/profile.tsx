import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Image, Alert, ActivityIndicator, Dimensions, Platform, ScrollView, TextInput, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl, assetUrl } from './config/api';
import { C } from './(tabs)/sensor';
import { getRankInfo, getRankProgress } from './utils/rank';
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

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [myUserId])
  );

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/leaderboard'), {
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
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        setEditName(u.fullName || '');
      }
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
      const res = await fetch(apiUrl(`/users/avatar/${myUserId}`), {
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

  const fullAvatarUrl = assetUrl(user.avatarUrl);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="arrow-left" size={16} color={T.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profilim</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={s.infoBtn}>
            <FontAwesome5 name="cog" size={16} color={T.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInfo(true)} style={s.infoBtn}>
            <FontAwesome5 name="info" size={16} color={T.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── AVATAR BÖLÜMÜ ── */}
        <View style={s.avatarWrap}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
            <View style={s.avatarContainer}>
              {fullAvatarUrl ? (
                <Image source={{ uri: fullAvatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarInitials}>{user.fullName?.charAt(0) || 'U'}</Text>
              )}

              <View style={s.editBadge}>
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FontAwesome5 name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── KULLANICI BİLGİLERİ ── */}
        <View style={s.infoWrap}>
          <Text style={s.name}>{user.fullName} {user.isPremium && <FontAwesome5 solid name="crown" size={18} color={T.accent} />}</Text>
          <Text style={s.username}>@{user.username || 'ogrenci'}</Text>
        </View>

        {/* ── İSTATİSTİKLER VE RÜTBE ── */}
        <View style={s.statsCard}>
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
              <Text style={{ color: T.textDark, fontWeight: 'bold', fontSize: 13 }}>{getRankInfo(user.totalFocusMinutes).title}</Text>
              <Text style={{ color: T.textMuted, fontSize: 12 }}>
                {getRankProgress(user.totalFocusMinutes).nextRank 
                  ? `${getRankProgress(user.totalFocusMinutes).current} / ${getRankProgress(user.totalFocusMinutes).total} Sonraki: ${getRankProgress(user.totalFocusMinutes).nextRank}` 
                  : 'Maksimum Seviye'}
              </Text>
            </View>
            <View style={{ width: '100%', height: 8, backgroundColor: T.border, borderRadius: 4, overflow: 'hidden' }}>
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
            <View style={s.analyticsBtn}>
              <FontAwesome5 name={user.isPremium ? "chart-pie" : "lock"} size={16} color={user.isPremium ? T.accent : T.textMuted} />
              <Text style={[s.analyticsText, !user.isPremium && { color: T.textMuted }]}>Detaylı Analitik (PRO)</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* NASIL PUAN KAZANILIR MODAL */}
      {showInfo && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }]}>
          <View style={{ backgroundColor: T.surface, padding: 30, borderRadius: 24, width: '85%', borderWidth: 1, borderColor: T.border, ...Theme.shadows.medium }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: T.textDark, marginBottom: 15, textAlign: 'center' }}>Nasıl Puan Kazanılır?</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
              <FontAwesome5 name="mobile-alt" size={16} color={T.primary} style={{ marginTop: 2 }} />
              <Text style={{ color: T.textDark, flex: 1, lineHeight: 22 }}>Çalışma odasındayken cihazı masaya ters veya düz bıraktığınızda puan kazanımı başlar.</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
              <FontAwesome5 name="stopwatch" size={16} color={T.success} style={{ marginTop: 2 }} />
              <Text style={{ color: T.textDark, flex: 1, lineHeight: 22 }}>Her <Text style={{fontWeight:'bold'}}>1 dakika</Text> odaklanma size <Text style={{fontWeight:'bold'}}>1 Puan</Text> kazandırır.</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 25, gap: 10 }}>
              <FontAwesome5 name="crown" size={16} color={T.accent} style={{ marginTop: 2 }} />
              <Text style={{ color: T.textDark, flex: 1, lineHeight: 22 }}><Text style={{fontWeight:'bold', color: T.accent}}>Elite Odalarda</Text> geçirilen her dakika için odak puanları <Text style={{fontWeight:'bold', color: T.accent}}>2 ile çarpılarak</Text> verilir!</Text>
            </View>

            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ backgroundColor: T.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AYARLAR MODAL */}
      {showSettings && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }]}>
          <View style={{ backgroundColor: T.surface, padding: 30, borderRadius: 24, width: '85%', borderWidth: 1, borderColor: T.border, ...Theme.shadows.medium }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: T.textDark, marginBottom: 5, textAlign: 'center' }}>Profili Düzenle</Text>
            <Text style={{ fontSize: 13, color: T.textMuted, marginBottom: 20, textAlign: 'center' }}>İsmini değiştirebilirsin.</Text>
            
            <View style={{ backgroundColor: T.softIndigo, borderRadius: 12, marginBottom: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: T.border }}>
              <TextInput
                style={{ height: 50, color: T.textDark, fontSize: 16 }}
                placeholder="Ad Soyad"
                placeholderTextColor={T.textMuted}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={{ flex: 1, backgroundColor: T.softIndigo, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border }}>
                <Text style={{ color: T.textDark, fontWeight: 'bold' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={async () => {
                  if (!editName.trim()) return Alert.alert('Hata', 'İsim boş olamaz.');
                  setIsSavingName(true);
                  try {
                    const token = await AsyncStorage.getItem('access_token');
                    const res = await fetch(apiUrl(`/users/${myUserId}/profile`), {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ fullName: editName.trim() })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setUser(data.user);
                      const stored = await AsyncStorage.getItem('user_data');
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.fullName = data.user.fullName;
                        await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
                      }
                      setShowSettings(false);
                      Alert.alert('Başarılı', 'Profil güncellendi!');
                    } else {
                      Alert.alert('Hata', 'Güncellenemedi.');
                    }
                  } catch(e) {
                    Alert.alert('Hata', 'Bağlantı sorunu.');
                  } finally {
                    setIsSavingName(false);
                  }
                }} 
                style={{ flex: 1, backgroundColor: T.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                disabled={isSavingName}
              >
                {isSavingName ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  infoBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.primary, letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 25, alignItems: 'center', paddingBottom: 100 },
  
  avatarWrap: { marginTop: 30, marginBottom: 25 },
  avatarContainer: { width: 150, height: 150, borderRadius: 75, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.border, position: 'relative' },
  avatarImage: { width: 146, height: 146, borderRadius: 73 },
  avatarInitials: { fontSize: 50, fontWeight: '900', color: T.primary },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: T.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: T.surface, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 5 },
  
  infoWrap: { alignItems: 'center', marginBottom: 40 },
  name: { fontSize: 28, fontWeight: '900', color: T.textDark, marginBottom: 6, letterSpacing: 0.5 },
  username: { fontSize: 16, color: T.textMuted, fontWeight: '500' },
  
  statsCard: { width: '100%', backgroundColor: T.surface, borderRadius: 28, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  statItem: { alignItems: 'center', gap: 10 },
  statIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderWidth: 1, borderColor: T.border },
  statValue: { fontSize: 36, fontWeight: '900', color: T.textDark },
  statLabel: { fontSize: 14, color: T.textMuted, fontWeight: '700', letterSpacing: 1 },
  
  analyticsBtnWrap: { marginTop: 35, width: '100%' },
  analyticsBtn: { flexDirection: 'row', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, ...Theme.shadows.soft },
  analyticsText: { color: T.textDark, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: T.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: T.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: T.softInfo, opacity: 0.45 },
});
