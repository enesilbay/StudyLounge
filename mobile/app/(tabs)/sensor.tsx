import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  Dimensions, ScrollView, Modal, StatusBar, Alert, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client'; 
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const SOCKET_URL = 'http://10.192.24.96:3000';
const { width, height } = Dimensions.get('window');

export const C = {
  brand: '#1A237E',      // Deep Indigo (Ana Renk)
  primary: '#FFC107',    // Amber Gold (Vurgular)
  primaryDark: '#E6A800',// Koyu Amber
  bg: '#0A0E29',         // Çok Koyu Indigo (Arka plan)
  bgModal: '#121840',    // Biraz daha açık Indigo (Modal ve kartlar)
  card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.5)',
  success: '#10B981',
  danger: '#EF4444',
  btnText: '#1A0F00'
};

const SOUNDS = [
  { key: 'library', label: 'Kütüphane', icon: 'book', file: require('../../assets/sounds/library.mp3') },
  { key: 'rain',    label: 'Yağmur',    icon: 'cloud-rain', file: require('../../assets/sounds/rain.mp3') },
  { key: 'forest',  label: 'Doğa',      icon: 'leaf', file: require('../../assets/sounds/nature.mp3') },
  { key: 'fire',    label: 'Şömine',    icon: 'fire', file: require('../../assets/sounds/fire.mp3') },
];

const POMODORO_OPTIONS = [
  { label: '15 dk', minutes: 15 }, { label: '25 dk', minutes: 25 }, 
  { label: '45 dk', minutes: 45 }, { label: '60 dk', minutes: 60 },
];

const pad = (n: number) => String(n).padStart(2, '0');

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

export default function SensorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;

  const myUserId = Number(id);
  const safeFullName = typeof fullName === 'string' && fullName.trim() !== '' ? fullName : 'Öğrenci';

  const isFocused = useIsFocused();

  const [totalScore, setTotalScore] = useState(Number(score) || 0);
  const [isAtDesk, setIsAtDesk] = useState(false);
  const [isPremium, setIsPremium] = useState(false); 
  const [isConnected, setIsConnected] = useState(true);

  const [selectedSound, setSelectedSound] = useState(SOUNDS[0]);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);

  const [chatVisible, setChatVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatList, setChatList] = useState<any[]>([]);
  const chatAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const [roomUsers, setRoomUsers] = useState<any[]>([]);

  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSec, setPomodoroSec] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const pomTimerRef = useRef<any>(null); 
  const pomAnim = useRef(new Animated.Value(1)).current;

  const socketRef = useRef<any>(null);
  const previousDeskState = useRef<boolean | null>(null);
  const graceTimerRef = useRef<any>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    checkPremiumStatus();
    fetchChatHistory();
  }, []);

  const checkPremiumStatus = async () => {
    const stored = await AsyncStorage.getItem('user_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      setIsPremium(parsed.isPremium === true);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${SOCKET_URL}/messages/${roomName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setChatList(data.map((m: any) => ({
        userId: m.user?.id,
        fullName: m.user?.fullName || 'Bilinmeyen',
        text: m.text,
        type: m.type || 'text',
        fileUrl: m.fileUrl,
        isPremium: m.user?.isPremium || false
      })));
    } catch (e) { console.error("Geçmiş yüklenemedi"); }
  };

  const pickDocument = async () => {
    if (!isPremium) return Alert.alert("PRO Özellik", "Dosya paylaşımı için Premium olmalısın!");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        uploadFile(result.assets[0], 'file');
      }
    } catch (err) { console.log(err); }
  };

  const pickImage = async () => {
    if (!isPremium) return Alert.alert("PRO Özellik", "Görsel paylaşımı için Premium olmalısın!");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled) {
        uploadFile(result.assets[0], 'image');
      }
    } catch (err) { console.log(err); }
  };

  const uploadFile = async (fileAsset: any, explicitType: string = 'file') => {
    const formData = new FormData();
    // @ts-ignore
    const name = fileAsset.name || fileAsset.fileName || fileAsset.uri.split('/').pop();
    const mimeType = fileAsset.mimeType || fileAsset.type || (explicitType === 'image' ? 'image/jpeg' : 'application/pdf');
    
    formData.append('file', { uri: fileAsset.uri, name, type: mimeType } as any);
    formData.append('roomName', String(roomName));
    formData.append('userId', String(myUserId));

    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${SOCKET_URL}/messages/upload`, {
        method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      socketRef.current?.emit('send_message', {
        userId: myUserId, fullName: safeFullName, roomName, 
        text: name, type: data.type || explicitType, fileUrl: data.fileUrl, isPremium
      });
    } catch (e) { Alert.alert("Hata", "Dosya yüklenemedi"); }
  };

  useEffect(() => {
    let currentSound: Audio.Sound | null = null;
    let isMounted = true;

    async function loadNewSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(selectedSound.file, { isLooping: true, volume: 1.0 });
        if (isMounted) {
          setSoundObj(sound);
          currentSound = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (e) {
        console.log("Ses yüklenemedi:", e);
      }
    }
    loadNewSound();

    return () => {
      isMounted = false;
      if (currentSound) {
        currentSound.unloadAsync().catch(() => {});
      }
    };
  }, [selectedSound.key]);

  useEffect(() => {
    async function handlePlayback() {
      if (!soundObj) return;
      try {
        const status = await soundObj.getStatusAsync();
        if (status.isLoaded) {
          if (isSoundOn && isAtDesk && isFocused) {
            await soundObj.playAsync();
          } else {
            await soundObj.pauseAsync();
          }
        }
      } catch (e) {
        console.log("Ses oynatma hatası:", e);
      }
    }
    handlePlayback();
  }, [isAtDesk, isSoundOn, soundObj, isFocused]);

  useEffect(() => {
    if (pomodoroRunning) {
      pomTimerRef.current = setInterval(() => {
        setPomodoroSec((prev) => (prev <= 1 ? (clearInterval(pomTimerRef.current), 0) : prev - 1));
      }, 1000);
    } else clearInterval(pomTimerRef.current);
    return () => clearInterval(pomTimerRef.current);
  }, [pomodoroRunning]);

  const startPomodoro = (minutes: number) => {
    setPomodoroMinutes(minutes); setPomodoroSec(minutes * 60);
    setPomodoroRunning(true); setShowPomodoroModal(false);
  };

  const togglePomodoro = () => pomodoroSec === 0 ? startPomodoro(pomodoroMinutes) : setPomodoroRunning(!pomodoroRunning);

  useEffect(() => {
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      socketRef.current = io(SOCKET_URL, { transports: ['websocket'], auth: { token } });
      socketRef.current.on('connect', () => {
        setIsConnected(true);
        socketRef.current?.emit('join_lobby', { userId: id, roomName, fullName: safeFullName, maxUsers: params.maxUsers });
      });
      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });
      
      socketRef.current.on('room_users', (users: any[]) => {
        setRoomUsers(users);
        const me = users.find(u => Number(u.userId) === myUserId);
        if (me && typeof me.score === 'number') setTotalScore(me.score);
      });
      
      socketRef.current.on('receive_message', (msg: any) => {
        setChatList(prev => [...prev, msg]);
      });
      
      socketRef.current.on('score_update', (data: any) => {
        if (Number(data.userId) === myUserId) setTotalScore(data.score);
      });
    };
    initSocket();
    
    return () => { socketRef.current?.disconnect(); };
  }, []);

  useEffect(() => {
    let sub: any = null;
    if (isFocused) {
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const flat = Math.abs(z) > 0.8 && Math.abs(x) < 0.3 && Math.abs(y) < 0.3;
        
        if (flat) {
          if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
          }
          if (previousDeskState.current !== true) {
            setIsAtDesk(true);
            if (socketRef.current?.connected) {
              socketRef.current.emit('update_presence', { userId: id, isAtDesk: true, roomName });
            }
            previousDeskState.current = true;
          }
        } else {
          if (previousDeskState.current === true) {
            if (!graceTimerRef.current) {
              graceTimerRef.current = setTimeout(() => {
                setIsAtDesk(false);
                if (socketRef.current?.connected) {
                  socketRef.current.emit('update_presence', { userId: id, isAtDesk: false, roomName });
                }
                previousDeskState.current = false;
                graceTimerRef.current = null;
              }, 3000);
            }
          } else {
            setIsAtDesk(false);
          }
        }
      });
    } else {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      setIsAtDesk(false);
      if (socketRef.current?.connected && previousDeskState.current !== false) {
        socketRef.current.emit('update_presence', { userId: id, isAtDesk: false, roomName });
        previousDeskState.current = false;
      }
    }
    return () => {
      if (sub) sub.remove();
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, [isFocused]);

  const sendMessage = async () => {
    if (!message.trim() || !isPremium) return;
    socketRef.current?.emit('send_message', { userId: myUserId, fullName: safeFullName, roomName, text: message, isPremium });
    setMessage('');
  };

  const toggleChat = () => {
    if (!chatVisible) setChatVisible(true);
    Animated.spring(chatAnim, { toValue: chatVisible ? 0 : 1, useNativeDriver: true, tension: 60, friction: 12 }).start(() => {
      if (chatVisible) setChatVisible(false);
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <Animated.ScrollView contentContainerStyle={s.scroll} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {!isConnected && (
          <View style={s.offlineBanner}>
            <Text style={s.offlineText}>Bağlantı koptu, yeniden bağlanılıyor...</Text>
          </View>
        )}

        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.replace('/lobbies')} style={s.backBtn}>
            <FontAwesome5 solid name="chevron-left" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={s.headerRoom}>ODAK ODASI</Text>
            <Text style={s.headerName} numberOfLines={1}>{roomName}</Text>
          </View>
          <View style={s.scorePill}>
            <FontAwesome5 solid name="fire" size={12} color={C.primary} />
            <Text style={s.scoreText}>{totalScore}</Text>
          </View>
        </View>

        {/* STATUS CARD */}
        <View style={[s.statusCard, isAtDesk && s.statusCardActive]}>
          <View style={[s.statusIcon, isAtDesk && { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}>
            <FontAwesome5 solid name={isAtDesk ? "check-circle" : "clock"} size={26} color={isAtDesk ? C.success : 'rgba(255,255,255,0.3)'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, isAtDesk && { color: C.success }]}>{isAtDesk ? 'Odaklanıyor' : 'Bekleniyor...'}</Text>
            <Text style={s.statusDesc}>{isAtDesk ? 'Cihaz masada, odak puanı kazanıyorsun.' : 'Puan kazanmak için cihazı masaya bırakın.'}</Text>
          </View>
        </View>

        {/* POMODORO */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>POMODORO SAYACI</Text>
          <View style={s.pomodoroCard}>
            <Animated.View style={[s.timerInner, pomodoroRunning && { borderColor: C.primary, shadowColor: C.primary, shadowOffset: {width:0, height:0}, shadowOpacity: 0.5, shadowRadius: 10 }]}>
              <Text style={s.timerText}>{pad(Math.floor(pomodoroSec / 60))}:{pad(pomodoroSec % 60)}</Text>
            </Animated.View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowPomodoroModal(true)} style={s.pomSettingsBtn}>
                <FontAwesome5 solid name="sliders-h" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePomodoro}>
                <LinearGradient colors={pomodoroRunning ? ['#475569', '#334155'] : [C.primary, C.primaryDark]} style={s.pomPlayBtn}>
                  <FontAwesome5 solid name={pomodoroRunning ? "pause" : "play"} size={16} color={pomodoroRunning ? C.text : C.btnText} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ATMOSFER */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.sectionLabel}>ATMOSFER SESİ</Text>
            <TouchableOpacity onPress={() => setIsSoundOn(!isSoundOn)}>
              <FontAwesome5 solid name={isSoundOn ? "volume-up" : "volume-mute"} size={16} color={isSoundOn ? C.primary : 'rgba(255,255,255,0.3)'} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {SOUNDS.map(sItem => {
              const active = selectedSound.key === sItem.key;
              return (
                <TouchableOpacity key={sItem.key} onPress={() => { setSelectedSound(sItem); setIsSoundOn(true); }} style={[s.soundTile, active && s.soundTileActive]}>
                  <FontAwesome5 solid name={sItem.icon} size={20} color={active ? C.btnText : 'rgba(255,255,255,0.5)'} />
                  <Text style={[s.soundText, active && { color: C.btnText }]}>{sItem.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* AKTİF KULLANICILAR */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ODADAKİLER ({roomUsers.length})</Text>
          <View style={s.usersWrap}>
            {roomUsers.map((u, i) => (
              <View key={i} style={s.userChip}>
                <View style={[s.userDot, { backgroundColor: u.isAtDesk ? C.success : 'rgba(255,255,255,0.2)' }]} />
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }}>{u.fullName?.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* CHAT DRAWER */}
      {chatVisible && (
        <Animated.View style={[s.chatDrawer, { transform: [{ translateY: chatAnim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={s.chatHeader}>
              <Text style={s.chatTitle}>Lobi Sohbeti {!isPremium && '🔒'}</Text>
              <TouchableOpacity onPress={toggleChat} style={s.chatCloseBtn}>
                <FontAwesome5 solid name="times" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef} data={chatList} keyExtractor={(_, i) => i.toString()} style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 12 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              renderItem={({ item }) => {
                const isMe = item.userId === myUserId;
                const isFile = item.type === 'file';
                const isImage = item.type === 'image';
                return (
                  <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                    {!isMe && <Text style={s.bubbleUser}>{item.fullName?.split(' ')[0]} {item.isPremium ? '✨' : ''}</Text>}
                    {isImage ? (
                      <TouchableOpacity onPress={() => Linking.openURL(`${SOCKET_URL}${item.fileUrl}`)}>
                        <Image source={{ uri: `${SOCKET_URL}${item.fileUrl}` }} style={s.imagePreview} />
                      </TouchableOpacity>
                    ) : isFile ? (
                      <TouchableOpacity style={s.fileCard} onPress={() => Linking.openURL(`${SOCKET_URL}${item.fileUrl}`)}>
                        <View style={s.fileIconWrap}><FontAwesome5 solid name="file-pdf" size={16} color={C.danger} /></View>
                        <Text style={s.fileName} numberOfLines={1}>{item.text}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ color: C.text, fontSize: 14 }}>{item.text}</Text>
                    )}
                  </View>
                );
              }}
            />

            <View style={s.chatInputRow}>
              <TouchableOpacity onPress={pickImage} style={s.attachBtn}><FontAwesome5 solid name="image" size={18} color={isPremium ? C.primary : 'rgba(255,255,255,0.2)'} /></TouchableOpacity>
              <TouchableOpacity onPress={pickDocument} style={s.attachBtn}><FontAwesome5 solid name="paperclip" size={18} color={isPremium ? C.primary : 'rgba(255,255,255,0.2)'} /></TouchableOpacity>
              <TextInput
                style={[s.chatInput, !isPremium && { opacity: 0.5 }]} value={message} onChangeText={setMessage}
                placeholder={isPremium ? "Mesaj yaz..." : "PRO Üyelik Gerekli 🔒"} placeholderTextColor="rgba(255,255,255,0.3)" editable={isPremium}
              />
              <TouchableOpacity onPress={sendMessage} disabled={!isPremium} style={s.sendBtn}>
                <LinearGradient colors={isPremium ? [C.primary, C.primaryDark] : ['#475569', '#334155']} style={s.sendBtnGrad}>
                  <FontAwesome5 solid name={isPremium ? "paper-plane" : "lock"} size={14} color={isPremium ? C.btnText : "rgba(255,255,255,0.5)"} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {!chatVisible && (
        <TouchableOpacity style={s.fab} onPress={toggleChat}>
          <LinearGradient colors={[C.primary, C.primaryDark]} style={s.fabGrad}>
            <FontAwesome5 solid name="comment-dots" size={22} color={C.btnText} />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      <Modal visible={showPomodoroModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Pomodoro Süresi</Text>
            {POMODORO_OPTIONS.map(o => (
              <TouchableOpacity key={o.minutes} onPress={() => startPomodoro(o.minutes)} style={s.modalOpt}>
                <Text style={s.modalOptText}>{o.label}</Text>
                <FontAwesome5 solid name="chevron-right" size={12} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STİLLER
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 15 },
  offlineBanner: { backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', alignItems: 'center' },
  offlineText: { color: C.danger, fontSize: 13, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerRoom: { fontSize: 12, color: C.primary, fontWeight: '800', letterSpacing: 1 },
  headerName: { fontSize: 24, fontWeight: '900', color: C.text },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)' },
  scoreText: { color: C.primary, fontWeight: '900', fontSize: 16 },
  
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statusCardActive: { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.05)' },
  statusIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.card, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  statusTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 3 },
  statusDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  
  pomodoroCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, gap: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  timerInner: { width: 85, height: 85, borderRadius: 42.5, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  timerText: { fontSize: 24, fontWeight: '900', color: C.text },
  pomSettingsBtn: { width: 48, height: 48, backgroundColor: C.card, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pomPlayBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  soundTile: { width: 90, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  soundTileActive: { backgroundColor: C.primary, borderColor: C.primaryDark },
  soundText: { marginTop: 10, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  
  usersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.card },
  userDot: { width: 8, height: 8, borderRadius: 4 },
  
  chatDrawer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.6, backgroundColor: C.bgModal, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: C.border },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1, borderColor: C.card },
  chatTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  chatCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginVertical: 6 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,193,7,0.15)', borderBottomRightRadius: 4, borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)' },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: C.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleUser: { fontSize: 11, color: C.primary, fontWeight: '800', marginBottom: 5 },
  imagePreview: { width: 160, height: 160, borderRadius: 14, marginVertical: 5 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 14 },
  fileIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' },
  fileName: { color: C.text, fontSize: 13, flex: 1, fontWeight: '500' },
  
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.card },
  chatInput: { flex: 1, height: 48, backgroundColor: C.card, borderRadius: 24, paddingHorizontal: 18, color: C.text, borderWidth: 1, borderColor: C.border },
  attachBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.03)' },
  sendBtn: { borderRadius: 24, overflow: 'hidden', elevation: 4 },
  sendBtnGrad: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  
  fab: { position: 'absolute', bottom: 35, right: 22, width: 64, height: 64, borderRadius: 32, overflow: 'hidden', elevation: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15 },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,12,20,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { backgroundColor: C.bgModal, padding: 30, borderRadius: 28, width: '85%', borderWidth: 1, borderColor: C.border },
  modalTitle: { color: C.text, fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  modalOpt: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: C.card, alignItems: 'center' },
  modalOptText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, left: -width * 0.2, width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, backgroundColor: 'rgba(255,193,7,0.06)' },
  orb2: { position: 'absolute', bottom: height * 0.05, right: -width * 0.3, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(99,102,241,0.05)' },
  orb3: { position: 'absolute', top: height * 0.4, left: width * 0.1, width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15, backgroundColor: 'rgba(255,193,7,0.04)' },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});
