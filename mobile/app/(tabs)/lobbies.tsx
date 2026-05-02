import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  TextInput, Modal, Alert, Animated, Dimensions,
  Platform, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = 'http://192.168.1.5:3000';
const { width } = Dimensions.get('window');

// ── StudyLounge Kurumsal Tema Paleti ──
const C = {
  bg: '#0F172A',            // Arka Plan: Gece Mavisi
  cardBg: '#FFFFFF',        // Kartlar: Bembeyaz
  primary: '#FFC107',       // Vurgu: Amber Gold
  primaryDark: '#F59E0B',   // Koyu Sarı (Gradient için)
  secondary: '#1A237E',     // Başlıklar ve Buton Yazıları: Derin Lacivert
  border: '#E2E8F0',        // İnce gri kenarlıklar
  inputBg: '#F8FAFC',       // Input arka planı
  success: '#10B981',       // Aktif yeşili
  danger: '#FEE2E2',        // Kırmızı arka plan (Çıkış butonu için)
  dangerIcon: '#EF4444',    // Kırmızı ikon
  textDark: '#1E293B',      // Koyu metin
  textMuted: '#64748B',     // Gri alt metin
  white: '#FFFFFF',
};

interface Lobby {
  id: string;
  name: string;
  icon: string;
  description: string;
  memberCount?: number;
  isActive?: boolean;
}

// ── Lobi Kartı (Beyaz & Soft Gölgeli) ──
function LobbyCard({ item, onPress, index }: { item: Lobby; onPress: () => void; index: number; }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 150 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 150 }).start();

  const memberCount = item.memberCount ?? Math.floor(Math.random() * 15) + 1;
  const isActive = item.isActive !== false;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={0.9}>
        <View style={card.wrap}>
          
          {/* İkon Kutusu (Sarımtırak) */}
          <View style={card.iconBox}>
            <FontAwesome5 name={item.icon || 'users'} size={20} color={C.primaryDark} />
          </View>

          {/* İçerik */}
          <View style={card.body}>
            <Text style={card.name} numberOfLines={1}>{item.name}</Text>
            <Text style={card.desc} numberOfLines={1}>{item.description}</Text>
            <View style={card.meta}>
              <View style={[card.dot, { backgroundColor: isActive ? C.success : '#94A3B8' }]} />
              <Text style={card.metaText}>{memberCount} kişi odaklanıyor</Text>
            </View>
          </View>

          {/* Sağ Ok */}
          <FontAwesome5 name="chevron-right" size={14} color={C.textMuted} style={{ opacity: 0.5 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Header İkon Butonu ──
function IconBtn({ name, onPress, danger }: { name: string; onPress: () => void; danger?: boolean; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[hdr.iconBtn, danger && { backgroundColor: C.danger, borderColor: C.danger }]}
    >
      <FontAwesome5 name={name} size={15} color={danger ? C.dangerIcon : C.primary} />
    </TouchableOpacity>
  );
}

// ── Ana Ekran ──
export default function LobbiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    fetchLobbies();
  }, []);

  const fetchLobbies = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/lobbies`);
      const data = await response.json();
      setLobbies(data);
    } catch {
      console.error('Lobi listesi yüklenemedi');
    }
  };

  const handleCreateLobby = async () => {
    if (!newName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir lobi ismi girin.');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/lobbies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, icon: 'users' }),
      });
      if (res.ok) {
        setIsModalVisible(false);
        setNewName('');
        setNewDesc('');
        fetchLobbies();
      } else {
        Alert.alert('Hata', 'Lobi oluşturulamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu bağlantı hatası.');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_data');
      router.replace('/');
    } catch (e) {
      console.error('Çıkış hatası:', e);
    }
  };

  const filteredLobbies = lobbies.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userName = typeof params.fullName === 'string' ? params.fullName.split(' ')[0] : 'Öğrenci';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* Arka Plan Efekti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.bgGlow} />
      </View>

      <View style={s.container}>
        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <View>
            <Text style={s.greeting}>İyi Çalışmalar,</Text>
            <Text style={s.pageTitle}>{userName}</Text>
          </View>
          <View style={s.headerBtns}>
            <IconBtn name="trophy" onPress={() => router.push('/leaderboard' as any)} />
            <IconBtn name="user-alt" onPress={() => router.push('/profile' as any)} />
            <IconBtn name="sign-out-alt" danger onPress={handleLogout} />
          </View>
        </Animated.View>

        {/* ── ARAMA KUTUSU (Beyaz Cam Efekti) ── */}
        <Animated.View style={[s.searchWrap, { opacity: headerAnim }]}>
          <FontAwesome5 name="search" size={14} color={C.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Çalışma odası bul..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        <Text style={s.sectionLabel}>AKTİF ODALAR</Text>

        {/* ── LOBİ LİSTESİ ── */}
        <FlatList
          data={filteredLobbies}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
          renderItem={({ item, index }) => (
            <LobbyCard item={item} index={index} onPress={() => router.push({ pathname: '/sensor' as any, params: { ...params, roomName: item.name } })} />
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <FontAwesome5 name="door-open" size={40} color={C.textMuted} opacity={0.5} />
              <Text style={s.emptyText}>Henüz lobi yok</Text>
              <Text style={s.emptySubText}>İlk çalışma odasını sen kur!</Text>
            </View>
          }
        />
      </View>

      {/* ── FAB: LOBİ KUR (Sarı Buton) ── */}
      <TouchableOpacity style={s.fab} onPress={() => setIsModalVisible(true)} activeOpacity={0.85}>
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.fabGrad}>
          <FontAwesome5 name="plus" size={14} color={C.secondary} />
          <Text style={s.fabText}>ODA KUR</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── LOBİ KURMA MODALI ── */}
      <Modal visible={isModalVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={mdl.overlay}>
            <View style={mdl.sheet}>
              <View style={mdl.handle} />
              <Text style={mdl.title}>Yeni Çalışma Odası</Text>
              <Text style={mdl.subtitle}>Arkadaşlarınla odaklanmak için bir oda oluştur.</Text>

              <TextInput
                style={mdl.input}
                placeholder="Oda İsmi (Örn: Vize Maratonu)"
                placeholderTextColor={C.textMuted}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={[mdl.input, { height: 80, textAlignVertical: 'top', paddingTop: 15 }]}
                placeholder="Açıklama (Örn: Sadece sesli sessizlik)"
                placeholderTextColor={C.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
              />

              <View style={mdl.btnRow}>
                <TouchableOpacity style={mdl.cancelBtn} onPress={() => setIsModalVisible(false)}>
                  <Text style={mdl.cancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateLobby} style={{ flex: 1 }}>
                  <LinearGradient colors={[C.primary, C.primaryDark]} style={mdl.createBtn}>
                    <Text style={mdl.createText}>Oluştur</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STİLLER
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bgGlow: {
    position: 'absolute', top: -50, left: width / 2 - 150, width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(255, 193, 7, 0.05)',
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 13, color: C.primary, fontWeight: '600', letterSpacing: 0.5 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: C.white, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg,
    borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.textDark, fontWeight: '500' },
  sectionLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 18, color: C.white, fontWeight: 'bold', marginTop: 10 },
  emptySubText: { fontSize: 14, color: C.textMuted },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
  fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 15 },
  fabText: { fontSize: 14, fontWeight: 'bold', color: C.secondary, letterSpacing: 1 },
});

const hdr = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderRadius: 20,
    padding: 16, gap: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  iconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255, 193, 7, 0.15)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: C.secondary, marginBottom: 3 },
  desc: { fontSize: 13, color: C.textMuted, marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
});

const mdl = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.cardBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, gap: 15 },
  handle: { width: 50, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: C.secondary },
  subtitle: { fontSize: 14, color: C.textMuted, marginTop: -5, marginBottom: 10 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 15, fontSize: 15, color: C.textDark },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, height: 55, borderRadius: 16, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: 'bold', color: C.textMuted },
  createBtn: { height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  createText: { fontSize: 16, fontWeight: 'bold', color: C.secondary, letterSpacing: 0.5 },
});