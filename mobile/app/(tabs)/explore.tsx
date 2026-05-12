import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  TextInput, Animated, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from '../config/api';
import { Theme } from '../utils/theme';

const T = Theme.colors;
const { width, height } = Dimensions.get('window');

function BackgroundOrbs() {
  return (
    <>
      <View style={bg.orb1} />
      <View style={bg.orb2} />
      <View style={bg.orb3} />
    </>
  );
}

function ExploreCard({ item, index, onPress }: { item: any; index: number; onPress: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={card.wrap}>
        <View style={[card.iconBox, item.isActive && { backgroundColor: T.lightAmber, borderColor: T.accent }]}>
          <FontAwesome5 solid name={item.icon || 'users'} size={18} color={item.isActive ? T.accent : T.primary} />
        </View>
        <View style={card.body}>
          <Text style={card.name} numberOfLines={1}>{item.name}</Text>
          <Text style={card.desc} numberOfLines={2}>{item.description || 'Henüz bir açıklama yok.'}</Text>
          {item.tags && (
            <View style={card.tagRow}>
              {item.tags.slice(0, 2).map((tag: string, i: number) => (
                <View key={i} style={card.tag}><Text style={card.tagText}>{tag}</Text></View>
              ))}
            </View>
          )}
        </View>
        <View style={card.chevronWrap}>
          <FontAwesome5 solid name="chevron-right" size={12} color={T.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExploreData();
    }, [])
  );

  const fetchExploreData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/lobbies'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map((l: any) => ({
        ...l,
        icon: l.icon || 'door-open',
        tags: l.isActive ? ['Aktif'] : ['Sakin'],
        isActive: l.isActive !== false,
      }));
      setRooms(mapped);
    } catch (e) {
      console.error('Keşif verisi yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.container}>
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <View style={s.headerTopRow}>
            <View>
              <Text style={s.greeting}>Yeni yerler kesfet,</Text>
              <Text style={s.pageTitle}>Kesfet</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile' as any)} activeOpacity={0.7} style={hdr.iconBtn}>
              <FontAwesome5 solid name="user-circle" size={18} color={T.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[s.searchWrap, { opacity: headerAnim }]}>
          <FontAwesome5 solid name="search" size={14} color={T.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Oda veya kullanici ara..."
            placeholderTextColor={T.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Kesfedilen Odalar</Text>
          <Text style={s.sectionCount}>{filteredRooms.length} sonuc</Text>
        </View>

        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 14 }}
          renderItem={({ item, index }) => (
            <ExploreCard
              item={item}
              index={index}
              onPress={() => {
                router.push({ pathname: '/lobbies' as any, params: { ...params } });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <FontAwesome5 solid name="compass" size={30} color={T.textMuted} />
              </View>
              <Text style={s.emptyText}>Sonuc bulunamadi</Text>
              <Text style={s.emptySubText}>Farkli bir arama dene.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 15 },
  header: { marginBottom: 18 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontSize: 13, color: T.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  pageTitle: { fontSize: 30, color: T.textDark, fontWeight: '900', marginTop: 2, letterSpacing: 0.5 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, paddingHorizontal: 18, height: 54, marginBottom: 22, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  searchInput: { flex: 1, fontSize: 15, color: T.textDark, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionLabel: { fontSize: 14, color: T.textDark, fontWeight: '900', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, color: T.textMuted, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: T.softIndigo, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyText: { fontSize: 18, color: T.textDark, fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: T.textMuted },
});

const hdr = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', ...Theme.shadows.soft },
});

const card = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 20, padding: 16, gap: 16, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  iconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, backgroundColor: T.softIndigo },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: T.textDark, marginBottom: 3 },
  desc: { fontSize: 13, color: T.textMuted, marginBottom: 6 },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: T.softIndigo, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: T.border },
  tagText: { fontSize: 11, color: T.primary, fontWeight: '700' },
  chevronWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center' },
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: T.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: T.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: T.softInfo, opacity: 0.45 },
});
