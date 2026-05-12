import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { apiUrl, assetUrl } from './config/api';
import { AppScreen, DarkSheetModal, IconButton, PageHeader, SoftCard } from './components/common';
import { C } from './(tabs)/sensor';
import { getRankInfo, getRankProgress } from './utils/rank';
import { Theme } from './utils/theme';

const T = C;

type UserProfile = {
  id: number;
  username?: string;
  fullName?: string;
  totalFocusMinutes?: number;
  avatarUrl?: string;
  isPremium?: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchUserData = React.useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setEditName(parsed.fullName || '');
      }

      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/leaderboard'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allUsers = await res.json();
      if (Array.isArray(allUsers)) {
        const me = allUsers.find((item: UserProfile) => item.id === myUserId);
        if (me) {
          setUser((current) => ({ ...current, ...me }));
          setEditName(me.fullName || '');
        }
      }
    } catch {
      Alert.alert('Hata', 'Profil bilgileri yuklenemedi.');
    }
  }, [myUserId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [fetchUserData]),
  );

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin gerekli', 'Avatar secmek icin galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const fileUri = Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', '');
      formData.append('file', { uri: fileUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);

      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl(`/users/avatar/${myUserId}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error('Avatar yuklenemedi.');
      }

      setUser(data.user);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
    } catch {
      Alert.alert('Hata', 'Avatar yuklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveName = async () => {
    if (!editName.trim()) {
      Alert.alert('Hata', 'Isim bos olamaz.');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl(`/users/${myUserId}/profile`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error('Profil guncellenemedi.');
      }

      setUser(data.user);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
      setSettingsVisible(false);
    } catch {
      Alert.alert('Hata', 'Profil guncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator color={T.primary} />
        </View>
      </AppScreen>
    );
  }

  const score = user.totalFocusMinutes ?? 0;
  const rank = getRankInfo(score);
  const progress = getRankProgress(score);
  const avatar = assetUrl(user.avatarUrl);

  return (
    <AppScreen scroll>
      <PageHeader
        title="Profil"
        eyebrow="Odak kimligin"
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <IconButton name="cog" onPress={() => setSettingsVisible(true)} />
            <IconButton name="info" onPress={() => setInfoVisible(true)} />
          </View>
        }
      />

      <View style={styles.hero}>
        <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.86}>
          <View style={styles.avatar}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
            )}
            <View style={styles.cameraBadge}>
              {isUploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <FontAwesome5 solid name="camera" size={13} color="#FFFFFF" />}
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>
          {user.fullName} {user.isPremium ? 'PRO' : ''}
        </Text>
        <Text style={styles.username}>@{user.username || 'ogrenci'}</Text>
      </View>

      <View style={styles.statsGrid}>
        <SoftCard style={styles.statCard}>
          <FontAwesome5 solid name={rank.icon} size={22} color={rank.color} />
          <Text style={[styles.statValue, { color: rank.color }]}>{rank.title}</Text>
          <Text style={styles.statLabel}>Rutbe</Text>
        </SoftCard>
        <SoftCard style={styles.statCard}>
          <FontAwesome5 solid name="fire-alt" size={22} color={T.danger} />
          <Text style={styles.statValue}>{score}</Text>
          <Text style={styles.statLabel}>Odak puani</Text>
        </SoftCard>
      </View>

      <SoftCard style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>Sonraki rutbe</Text>
          <Text style={styles.progressText}>{progress.nextRank ?? 'Maksimum'}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress.percentage}%`, backgroundColor: rank.color }]} />
        </View>
        <Text style={styles.statLabel}>
          {progress.nextRank ? `${progress.current} / ${progress.total} puan` : 'Tum rutbeler tamamlandi.'}
        </Text>
      </SoftCard>

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => {
          if (user.isPremium) {
            router.push('/analytics' as any);
          } else {
            router.push({ pathname: '/premium', params: { id: myUserId } } as any);
          }
        }}
      >
        <SoftCard style={styles.analyticsButton}>
          <FontAwesome5 solid name={user.isPremium ? 'chart-pie' : 'lock'} size={16} color={user.isPremium ? T.accent : T.textMuted} />
          <Text style={styles.analyticsText}>{user.isPremium ? 'Analitik paneline git' : 'Analitik icin PRO gerekli'}</Text>
          <FontAwesome5 solid name="chevron-right" size={12} color={T.primary} />
        </SoftCard>
      </TouchableOpacity>

      <DarkSheetModal visible={infoVisible} onClose={() => setInfoVisible(false)}>
        <Text style={styles.sheetTitle}>Puan nasil kazanilir?</Text>
        <Text style={styles.sheetText}>Calisma odasinda telefon masadayken her dakika 1 odak puani kazandirir. Elite odalarda bu puan ikiye katlanir.</Text>
        <TouchableOpacity onPress={() => setInfoVisible(false)} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Anladim</Text>
        </TouchableOpacity>
      </DarkSheetModal>

      <DarkSheetModal visible={settingsVisible} onClose={() => setSettingsVisible(false)}>
        <Text style={styles.sheetTitle}>Profili duzenle</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Ad Soyad" placeholderTextColor={T.textMuted} />
        </View>
        <View style={styles.sheetActions}>
          <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Iptal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveName} disabled={isSaving} style={styles.primaryBtn}>
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </DarkSheetModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  hero: {
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: T.border,
    padding: 26,
    marginBottom: 16,
    ...Theme.shadows.medium,
  },
  avatar: { width: 132, height: 132, borderRadius: 66, backgroundColor: T.softIndigo, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 128, height: 128, borderRadius: 64 },
  avatarText: { color: T.primary, fontSize: 46, fontWeight: '900' },
  cameraBadge: { position: 'absolute', right: 4, bottom: 4, width: 38, height: 38, borderRadius: 19, backgroundColor: T.primary, borderWidth: 3, borderColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  name: { color: T.textDark, fontSize: 26, fontWeight: '900', marginTop: 18, textAlign: 'center' },
  username: { color: T.textMuted, fontSize: 15, fontWeight: '700', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', gap: 8 },
  statValue: { color: T.textDark, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: T.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  progressCard: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: T.textDark, fontSize: 16, fontWeight: '900' },
  progressText: { color: T.primary, fontSize: 13, fontWeight: '900' },
  track: { height: 9, backgroundColor: T.border, borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', borderRadius: 999 },
  analyticsButton: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  analyticsText: { flex: 1, color: T.textDark, fontSize: 15, fontWeight: '900' },
  sheetTitle: { color: T.textDark, fontSize: 20, fontWeight: '900', marginBottom: 10 },
  sheetText: { color: T.textMuted, fontSize: 14, fontWeight: '600', lineHeight: 21, marginBottom: 18 },
  inputWrap: { backgroundColor: T.softIndigo, borderRadius: 14, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, marginBottom: 16 },
  input: { height: 52, color: T.textDark, fontSize: 16, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: T.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryBtn: { flex: 1, backgroundColor: T.softIndigo, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderWidth: 1, borderColor: T.border },
  secondaryBtnText: { color: T.textDark, fontWeight: '900' },
});
