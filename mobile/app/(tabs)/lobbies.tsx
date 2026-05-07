import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  TextInput, Modal, Alert, Animated, Dimensions,
  Platform, KeyboardAvoidingView, StatusBar, ScrollView, Image, Switch, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from './sensor';

const BACKEND_URL = 'http://10.192.24.96:3000';
const { width } = Dimensions.get('window');

interface Lobby {
  id: string;
  name: string;
  icon: string;
  description: string;
  memberCount?: number;
  isActive?: boolean;
  isPrivate?: boolean;
  maxUsers?: number;
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
          <View style={card.iconBox}>
            <FontAwesome5 solid name={item.isPrivate ? 'lock' : (item.icon || 'users')} size={20} color={C.primaryDark} />
          </View>
          <View style={card.body}>
            <Text style={card.name} numberOfLines={1}>{item.name}</Text>
            <Text style={card.desc} numberOfLines={1}>{item.description}</Text>
            <View style={card.meta}>
              <View style={[card.dot, { backgroundColor: isActive ? C.success : '#94A3B8' }]} />
              <Text style={card.metaText}>{memberCount} kişi odaklanıyor</Text>
            </View>
          </View>
          <FontAwesome5 solid name="chevron-right" size={14} color={C.textMuted} style={{ opacity: 0.5 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Header İkon Butonu ──
function IconBtn({ name, onPress, danger }: { name: string; onPress: () => void; danger?: boolean; }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[hdr.iconBtn, danger && { backgroundColor: C.danger, borderColor: C.danger }]}>
      <FontAwesome5 solid name={name} size={15} color={danger ? C.dangerIcon : C.primary} />
    </TouchableOpacity>
  );
}

// ── Ana Ekran ──
export default function LobbiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id); // Kendi ID'miz

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 👇 YENİ: Premium Durumunu Tutan State 👇
  const [isPremium, setIsPremium] = useState(false);

  // Lobi Kurma State'leri
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  // Gizli Odaya Giriş State'leri
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [enterPassword, setEnterPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Arkadaş Ekleme State'leri
  const [isFriendModalVisible, setIsFriendModalVisible] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [isSendingFriendReq, setIsSendingFriendReq] = useState(false);

  // Arkadaş Listesi ve İstekler State'leri
  const [isSocialModalVisible, setIsSocialModalVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const headerAnim = useRef(new Animated.Value(0)).current;

  // 1. Animasyon (Sadece sayfa ilk yüklendiğinde bir kez çalışır)
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // 2. Canlı Yenileme (Sayfaya her odaklanıldığında verileri sessizce tazele)
  useFocusEffect(
    useCallback(() => {
      fetchLobbies();
      loadSocialData();
      checkPremiumStatus(); // 👈 Her girişte Premium olup olmadığını kontrol et
    }, [myUserId])
  );

  // 👇 YENİ: AsyncStorage'dan Premium durumunu okuyan fonksiyon 👇
  const checkPremiumStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsPremium(parsed.isPremium === true);
      }
    } catch (e) {
      console.error('Premium durumu çekilemedi', e);
    }
  };

  const getToken = async () => await AsyncStorage.getItem('access_token');

  const fetchLobbies = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/lobbies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['user_data', 'access_token']);
        router.replace('/');
        return;
      }
      const data = await response.json();
      setLobbies(Array.isArray(data) ? data : []);
    } catch {
      console.error('Lobi listesi yüklenemedi');
    }
  };

  const loadSocialData = async () => {
    if (!myUserId) return;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [friendsRes, reqsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/users/friends/${myUserId}`, { headers }),
        fetch(`${BACKEND_URL}/users/friend-requests/${myUserId}`, { headers })
      ]);
      const friendsData = await friendsRes.json();
      const reqsData = await reqsRes.json();
      
      setFriends(Array.isArray(friendsData) ? friendsData : []);
      setRequests(Array.isArray(reqsData) ? reqsData : []);
      
    } catch (e) {
      console.error('Sosyal veriler yüklenirken hata:', e);
      setFriends([]);
      setRequests([]);
    }
  };

  const handleRespondRequest = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/users/respond-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId, receiverId: myUserId, status }),
      });
      if (res.ok) {
        loadSocialData(); 
      }
    } catch (e) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    }
  };

  const handleCreateLobby = async () => {
    if (!newName.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen bir lobi ismi girin.');
    if (isPrivate && !roomPassword.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen gizli oda için bir şifre belirleyin.');
    
    const maxUsers = isPrivate ? (isPremium ? 5 : 2) : 50;

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/lobbies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newName, 
          description: newDesc, 
          icon: 'users',
          isPrivate,
          password: isPrivate ? roomPassword : null,
          maxUsers,
          ownerId: myUserId
        }),
      });
      if (res.ok) {
        setIsModalVisible(false);
        setNewName(''); setNewDesc(''); setIsPrivate(false); setRoomPassword('');
        fetchLobbies();
      }
    } catch { Alert.alert('Hata', 'Sunucu bağlantı hatası.'); }
  };

  const handleVerifyPassword = async () => {
    if (!selectedLobby) return;
    if (!enterPassword.trim()) return Alert.alert('Hata', 'Lütfen şifre girin.');
    setIsVerifying(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/lobbies/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lobbyId: selectedLobby.id, password: enterPassword }),
      });
      if (res.ok) {
        setIsPasswordModalVisible(false);
        setEnterPassword('');
        router.push({ pathname: '/sensor' as any, params: { ...params, roomName: selectedLobby.name, maxUsers: selectedLobby.maxUsers || 50 } });
      } else {
        Alert.alert('Hata', 'Şifre hatalı!');
      }
    } catch (e) {
      console.error('Verify password error:', e);
      Alert.alert('Hata', 'Sunucu bağlantı hatası.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendUsername.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen bir kullanıcı adı girin.');
    setIsSendingFriendReq(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/users/friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senderId: myUserId, receiverUsername: friendUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi!');
        setIsFriendModalVisible(false);
        setFriendUsername('');
      } else {
        Alert.alert('Hata', data.message || 'İstek gönderilemedi.');
      }
    } catch { Alert.alert('Hata', 'Sunucu bağlantı hatası.'); } 
    finally { setIsSendingFriendReq(false); }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_data');
      router.replace('/');
    } catch (e) { console.error('Çıkış hatası:', e); }
  };

  const filteredLobbies = lobbies.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const userName = typeof params.fullName === 'string' ? params.fullName.split(' ')[0] : 'Öğrenci';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none"><View style={s.bgGlow} /></View>

      <View style={s.container}>
        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <View>
            <Text style={s.greeting}>İyi Çalışmalar,</Text>
            <Text style={s.pageTitle}>{userName}</Text>
          </View>
          <View style={s.headerBtns}>
            
            {/* Bildirim Zili ve Badge */}
            <TouchableOpacity onPress={() => setIsSocialModalVisible(true)} activeOpacity={0.7} style={hdr.iconBtn}>
              <FontAwesome5 solid name="bell" size={15} color={C.primary} />
              {requests.length > 0 && (
                <View style={hdr.badge}>
                  <Text style={hdr.badgeText}>{requests.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <IconBtn name="user-plus" onPress={() => setIsFriendModalVisible(true)} />
            <IconBtn name="trophy" onPress={() => router.push('/leaderboard' as any)} />
            
            {/* Premium Mağaza Butonu */}
            <IconBtn name="crown" onPress={() => router.push({ pathname: '/premium', params: { id: myUserId } } as any)} />
            
            {/* Profil Sayfası */}
            <IconBtn name="user-alt" onPress={() => router.push({ pathname: '/profile', params: { id: myUserId } } as any)} />
            <IconBtn name="sign-out-alt" danger onPress={handleLogout} />
          </View>
        </Animated.View>

        {/* ── ARAMA KUTUSU ── */}
        <Animated.View style={[s.searchWrap, { opacity: headerAnim }]}>
          <FontAwesome5 solid name="search" size={14} color={C.textMuted} style={{ marginRight: 12 }} />
          <TextInput style={s.searchInput} placeholder="Çalışma odası bul..." placeholderTextColor={C.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
        </Animated.View>

        <Text style={s.sectionLabel}>AKTİF ODALAR</Text>

        <FlatList
          data={filteredLobbies}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
          renderItem={({ item, index }) => (
            <LobbyCard 
              item={item} 
              index={index} 
              onPress={() => {
                if (item.isPrivate) {
                  setSelectedLobby(item);
                  setIsPasswordModalVisible(true);
                } else {
                  router.push({ pathname: '/sensor' as any, params: { ...params, roomName: item.name } });
                }
              }} 
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <FontAwesome5 solid name="door-open" size={40} color={C.textMuted} opacity={0.5} />
              <Text style={s.emptyText}>Henüz lobi yok</Text>
              <Text style={s.emptySubText}>İlk çalışma odasını sen kur!</Text>
            </View>
          }
        />
      </View>

      {/* 👇 DÜZELTME: ODA KUR BUTONUNA PRO KİLİDİ 👇 */}
      <TouchableOpacity 
        style={s.fab} 
        onPress={() => {
          if (isPremium) {
            setIsModalVisible(true);
          } else {
            // PRO değilse Premium Satın Alma ekranına yönlendir
            router.push({ pathname: '/premium', params: { id: myUserId } } as any);
          }
        }} 
        activeOpacity={0.85}
      >
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.fabGrad}>
          {/* PRO değilse Kilit ikonu, PRO ise Artı ikonu göster */}
          <FontAwesome5 solid name={isPremium ? "plus" : "lock"} size={14} color={C.secondary} />
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
              <TextInput style={mdl.input} placeholder="Oda İsmi" placeholderTextColor={C.textMuted} value={newName} onChangeText={setNewName} />
              <TextInput style={[mdl.input, { height: 80, textAlignVertical: 'top', paddingTop: 15 }]} placeholder="Açıklama" placeholderTextColor={C.textMuted} value={newDesc} onChangeText={setNewDesc} multiline />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 5 }}>
                <Text style={{ color: C.textMuted, fontSize: 16, fontWeight: 'bold' }}>Gizli Oda (Kilitli)</Text>
                <Switch
                  trackColor={{ false: '#767577', true: C.primary }}
                  thumbColor={isPrivate ? C.white : '#f4f3f4'}
                  onValueChange={setIsPrivate}
                  value={isPrivate}
                />
              </View>

              {isPrivate && (
                <>
                  <TextInput style={[mdl.input, { marginTop: 15 }]} placeholder="Oda Şifresi" placeholderTextColor={C.textMuted} value={roomPassword} onChangeText={setRoomPassword} secureTextEntry />
                  <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 5, paddingHorizontal: 5 }}>
                    Gizli odalar {isPremium ? 'Premium olduğunuz için en fazla 5' : 'ücretsiz planda en fazla 2'} kişiliktir.
                  </Text>
                </>
              )}

              <View style={[mdl.btnRow, { marginTop: 20 }]}>
                <TouchableOpacity style={mdl.cancelBtn} onPress={() => { setIsModalVisible(false); setIsPrivate(false); setRoomPassword(''); }}><Text style={mdl.cancelText}>İptal</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleCreateLobby} style={{ flex: 1 }}>
                  <LinearGradient colors={[C.primary, C.primaryDark]} style={mdl.createBtn}><Text style={mdl.createText}>Oluştur</Text></LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ARKADAŞ EKLEME MODALI ── */}
      <Modal visible={isFriendModalVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={mdl.overlay}>
            <View style={mdl.sheet}>
              <View style={mdl.handle} />
              <Text style={mdl.title}>Arkadaş Ekle</Text>
              <Text style={mdl.subtitle}>Beraber odaklanmak için arkadaşlarını davet et.</Text>
              <TextInput style={mdl.input} placeholder="Kullanıcı Adı (Örn: ahmet_123)" placeholderTextColor={C.textMuted} value={friendUsername} onChangeText={setFriendUsername} autoCapitalize="none" />
              <View style={mdl.btnRow}>
                <TouchableOpacity style={mdl.cancelBtn} onPress={() => setIsFriendModalVisible(false)}><Text style={mdl.cancelText}>İptal</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSendFriendRequest} disabled={isSendingFriendReq} style={{ flex: 1 }}>
                  <LinearGradient colors={[C.primary, C.primaryDark]} style={mdl.createBtn}>
                    <Text style={mdl.createText}>{isSendingFriendReq ? 'Gönderiliyor...' : 'İstek Gönder'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── SOSYAL (İSTEKLER & ARKADAŞLAR) MODALI ── */}
      <Modal visible={isSocialModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={mdl.overlay}>
          <View style={[mdl.sheet, { height: '80%' }]}>
            <View style={mdl.handle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={mdl.title}>Sosyal</Text>
              <TouchableOpacity onPress={() => setIsSocialModalVisible(false)}>
                <FontAwesome5 solid name="times" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* BEKLEYEN İSTEKLER BÖLÜMÜ */}
              {requests.length > 0 && (
                <>
                  <Text style={flist.sectionTitle}>Bekleyen İstekler ({requests.length})</Text>
                  {requests.map((req) => (
                    <View key={req.id} style={flist.itemWrap}>
                      <View style={flist.avatar}>
                        {req.sender.avatarUrl ? (
                          <Image source={{ uri: `${BACKEND_URL}${req.sender.avatarUrl}` }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
                        ) : (
                          <Text style={flist.avatarText}>{req.sender.fullName.charAt(0)}</Text>
                        )}
                      </View>

                      <View style={flist.info}>
                        <Text style={flist.name}>{req.sender.fullName}</Text>
                        <Text style={flist.username}>@{req.sender.username}</Text>
                      </View>
                      <View style={flist.actions}>
                        <TouchableOpacity style={[flist.actionBtn, flist.acceptBtn]} onPress={() => handleRespondRequest(req.id, 'accepted')}>
                          <FontAwesome5 solid name="check" size={14} color="#059669" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[flist.actionBtn, flist.rejectBtn]} onPress={() => handleRespondRequest(req.id, 'rejected')}>
                          <FontAwesome5 solid name="times" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ARKADAŞLAR BÖLÜMÜ */}
              <Text style={[flist.sectionTitle, { marginTop: requests.length > 0 ? 25 : 10 }]}>Arkadaşlarım ({friends.length})</Text>
              {friends.length === 0 ? (
                <Text style={flist.emptyText}>Henüz arkadaş eklemediniz.</Text>
              ) : (
                friends.map((friend) => (
                  <View key={friend.id} style={flist.itemWrap}>
                    <View style={flist.avatar}>
                      {friend.avatarUrl ? (
                        <Image source={{ uri: `${BACKEND_URL}${friend.avatarUrl}` }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
                      ) : (
                        <Text style={flist.avatarText}>{friend.fullName.charAt(0)}</Text>
                      )}
                    </View>

                    <View style={flist.info}>
                      <Text style={flist.name}>{friend.fullName}</Text>
                      <Text style={flist.username}>@{friend.username}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={flist.scoreTitle}>Odak Süresi</Text>
                      <Text style={flist.score}>{friend.totalFocusMinutes} dk</Text>
                    </View>
                  </View>
                ))
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ŞİFRE GİRİŞ MODALI (Gizli Odalar İçin) ── */}
      <Modal visible={isPasswordModalVisible} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[mdl.overlay, { justifyContent: 'center', padding: 20 }]}>
            <View style={[mdl.sheet, { borderRadius: 24 }]}>
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,193,7,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                  <FontAwesome5 solid name="lock" size={24} color={C.primaryDark} />
                </View>
                <Text style={[mdl.title, { textAlign: 'center' }]}>Gizli Oda</Text>
                <Text style={[mdl.subtitle, { textAlign: 'center', marginTop: 5 }]}>
                  "{selectedLobby?.name}" odasına girmek için şifreyi giriniz.
                </Text>
              </View>

              <TextInput 
                style={[mdl.input, { textAlign: 'center', fontSize: 20, letterSpacing: 2 }]} 
                placeholder="Şifre" 
                placeholderTextColor={C.textMuted} 
                value={enterPassword} 
                onChangeText={setEnterPassword} 
                secureTextEntry 
                autoFocus
              />

              <View style={mdl.btnRow}>
                <TouchableOpacity style={mdl.cancelBtn} onPress={() => { setIsPasswordModalVisible(false); setEnterPassword(''); }}>
                  <Text style={mdl.cancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleVerifyPassword} disabled={isVerifying} style={{ flex: 1 }}>
                  <LinearGradient colors={[C.primary, C.primaryDark]} style={mdl.createBtn}>
                    {isVerifying ? <ActivityIndicator color={C.secondary} /> : <Text style={mdl.createText}>Giriş Yap</Text>}
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
  bgGlow: { position: 'absolute', top: -50, left: width / 2 - 150, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255, 193, 7, 0.05)' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 13, color: C.primary, fontWeight: '600', letterSpacing: 0.5 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: C.text, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  sectionLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 18, color: C.text, fontWeight: 'bold', marginTop: 10 },
  emptySubText: { fontSize: 14, color: C.textMuted },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
  fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 15 },
  fabText: { fontSize: 14, fontWeight: 'bold', color: C.bg, letterSpacing: 1 },
});

const hdr = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  badgeText: { color: C.text, fontSize: 10, fontWeight: 'bold' }
});

const card = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 20, padding: 16, gap: 15, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3 },
  iconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255, 193, 7, 0.15)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: C.text, marginBottom: 3 },
  desc: { fontSize: 13, color: C.textMuted, marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
});

const mdl = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, gap: 15 },
  handle: { width: 50, height: 5, borderRadius: 3, backgroundColor: C.textMuted, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: C.text },
  subtitle: { fontSize: 14, color: C.textMuted, marginTop: -5, marginBottom: 10 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 15, fontSize: 15, color: C.text },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, height: 55, borderRadius: 16, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: 'bold', color: C.text },
  createBtn: { height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  createText: { fontSize: 16, fontWeight: 'bold', color: C.bg, letterSpacing: 0.5 },
});

// Arkadaşlar Listesi İçin Stiller
const flist = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 0.5, marginBottom: 12 },
  itemWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 193, 7, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: C.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: C.text, marginBottom: 2 },
  username: { fontSize: 13, color: C.textMuted },
  scoreTitle: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginBottom: 2 },
  score: { fontSize: 14, color: C.green, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: C.green },
  rejectBtn: { backgroundColor: '#EF4444' },
  emptyText: { fontSize: 14, color: C.textMuted, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }
});
