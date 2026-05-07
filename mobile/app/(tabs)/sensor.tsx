import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  Dimensions, ScrollView, Modal, StatusBar, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client'; 
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker'; // Yeni eklendi

const SOCKET_URL = 'http://192.168.1.15:3000';
const { width, height } = Dimensions.get('window');

const C = {
  bg: '#0F172A',               
  surface: 'rgba(255,255,255,0.05)', 
  surfaceHigh: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.1)',
  primary: '#FFC107',          
  accent: '#F59E0B',           
  secondaryDark: '#1A237E',    
  green: '#10B981',            
  amber: '#FFC107',
  amberDim: 'rgba(255,193,7,0.15)',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  myBubble: 'rgba(255,193,7,0.15)',      
  myBubbleBorder: 'rgba(255,193,7,0.3)',
  otherBubble: 'rgba(255,255,255,0.06)', 
  otherBubbleBorder: 'rgba(255,255,255,0.1)',
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

export default function SensorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;

  const myUserId = Number(id);
  const safeFullName = typeof fullName === 'string' && fullName.trim() !== '' ? fullName : 'Öğrenci';

  const [totalScore, setTotalScore] = useState(Number(score) || 0);
  const [isAtDesk, setIsAtDesk] = useState(false);
  const [isPremium, setIsPremium] = useState(false); 

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
      const res = await fetch(`${SOCKET_URL}/messages/${roomName}`);
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

  // ── DOSYA YÜKLEME SİSTEMİ ──
  const pickDocument = async () => {
    if (!isPremium) return Alert.alert("PRO Özellik", "Dosya paylaşımı için Premium olmalısın!");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        uploadFile(result.assets[0]);
      }
    } catch (err) { console.log(err); }
  };

  const uploadFile = async (fileAsset: any) => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { uri: fileAsset.uri, name: fileAsset.name, type: fileAsset.mimeType });
    formData.append('roomName', String(roomName));
    formData.append('userId', String(myUserId));
    formData.append('type', 'file');

    try {
      const res = await fetch(`${SOCKET_URL}/messages/upload`, {
        method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await res.json();
      socketRef.current?.emit('send_message', {
        userId: myUserId, fullName: safeFullName, roomName, 
        text: fileAsset.name, type: 'file', fileUrl: data.fileUrl, isPremium
      });
    } catch (e) { Alert.alert("Hata", "Dosya yüklenemedi"); }
  };

  // ── SES SİSTEMİ ──
  useEffect(() => {
    async function loadNewSound() {
      if (soundObj) await soundObj.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(selectedSound.file, { isLooping: true, volume: 1.0 });
      setSoundObj(sound);
    }
    loadNewSound();
    return () => { soundObj?.unloadAsync(); };
  }, [selectedSound]);

  useEffect(() => {
    if (soundObj) {
      if (isSoundOn && isAtDesk) soundObj.playAsync();
      else soundObj.pauseAsync();
    }
  }, [isAtDesk, isSoundOn, soundObj]);

  // ── Pomodoro ──
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

  // ── Socket ──
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current.on('connect', () => socketRef.current?.emit('join_lobby', { userId: id, roomName, fullName: safeFullName }));
    socketRef.current.on('receive_message', (data: any) => {
      setChatList((prev) => [...prev, data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    socketRef.current.on('room_users', setRoomUsers);
    
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const flat = Math.abs(z) > 0.8 && Math.abs(x) < 0.3 && Math.abs(y) < 0.3;
      setIsAtDesk(flat);
      if (socketRef.current?.connected && flat !== previousDeskState.current) {
        socketRef.current.emit('update_presence', { userId: id, isAtDesk: flat, roomName });
        previousDeskState.current = flat;
      }
    });
    return () => { socketRef.current?.disconnect(); sub.remove(); };
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || !isPremium) return;
    try {
      await fetch(`${SOCKET_URL}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message, roomName, userId: myUserId }),
      });
      socketRef.current.emit('send_message', { userId: myUserId, fullName: safeFullName, roomName, text: message, isPremium });
      setMessage('');
    } catch (e) { Alert.alert("Hata", "Mesaj iletilemedi"); }
  };

  const toggleChat = () => {
    if (chatVisible) {
      Animated.timing(chatAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setChatVisible(false));
    } else {
      setChatVisible(true);
      Animated.spring(chatAnim, { toValue: 1, tension: 90, friction: 14, useNativeDriver: true }).start();
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.bgBase} /><View style={[s.bgGlow, isAtDesk && { backgroundColor: 'rgba(16,185,129,0.08)' }]} />
      </View>

      <Animated.ScrollView style={{ flex: 1, opacity: fadeAnim }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* HEADER & SCORE */}
        <View style={s.header}>
          <View>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 5 }}><FontAwesome5 name="arrow-left" size={16} color={C.textMuted} /></TouchableOpacity>
            <Text style={s.headerRoom}>📍 {roomName}</Text>
            <Text style={s.headerName}>{safeFullName.split(' ')[0]}</Text>
          </View>
          <View style={s.scorePill}><FontAwesome5 name="fire" size={13} color={C.amber} /><Text style={s.scoreText}>{totalScore}</Text></View>
        </View>

        {/* STATUS CARD */}
        <View style={[s.statusCard, isAtDesk && s.statusCardActive]}>
          <FontAwesome5 name={isAtDesk ? 'headset' : 'mobile-alt'} size={28} color={isAtDesk ? C.green : C.textMuted} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.statusTitle, isAtDesk && { color: C.green }]}>{isAtDesk ? 'Odaklanıyorsun' : 'Bekleniyor'}</Text>
            <Text style={s.statusDesc}>{isAtDesk ? 'Harika! Puan kazanmaya devam et.' : 'Telefonu masaya yüzüstü bırak.'}</Text>
          </View>
        </View>

        {/* POMODORO */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>POMODORO</Text>
          <View style={s.pomodoroCard}>
            <View style={s.timerInner}><Text style={s.timerText}>{pad(Math.floor(pomodoroSec / 60))}:{pad(pomodoroSec % 60)}</Text></View>
            <View style={{ flex: 1, gap: 10 }}>
              <TouchableOpacity style={s.pomSettingsBtn} onPress={() => setShowPomodoroModal(true)}><Text style={{ color: '#FFF' }}>{pomodoroMinutes} dk Ayarla</Text></TouchableOpacity>
              <TouchableOpacity onPress={togglePomodoro} style={[s.pomPlayBtn, { backgroundColor: pomodoroRunning ? C.red : C.primary }]}><Text style={{ fontWeight: 'bold' }}>{pomodoroRunning ? 'DURDUR' : 'BAŞLAT'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ODADAKİ KİŞİLER */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ODADAKİ KİŞİLER</Text>
          <View style={s.usersWrap}>
            {roomUsers.map((u, i) => (
              <View key={i} style={s.userChip}><View style={[s.userDot, { backgroundColor: u.isAtDesk ? C.green : C.textMuted }]} /><Text style={{ color: '#FFF' }}>{u.fullName?.split(' ')[0]}</Text></View>
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
              <TouchableOpacity onPress={toggleChat}><FontAwesome5 name="times" size={18} color={C.textMuted} /></TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef} data={chatList} keyExtractor={(_, i) => i.toString()} style={{ flex: 1 }} contentContainerStyle={{ padding: 15, gap: 10 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              renderItem={({ item }) => {
                const isMe = item.userId === myUserId;
                const isFile = item.type === 'file';
                return (
                  <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                    {!isMe && <Text style={s.bubbleUser}>{item.fullName?.split(' ')[0]} {item.isPremium ? '✨' : ''}</Text>}
                    {isFile ? (
                      <TouchableOpacity style={s.fileCard} onPress={() => Linking.openURL(`${SOCKET_URL}${item.fileUrl}`)}>
                        <FontAwesome5 name="file-pdf" size={20} color={C.red} />
                        <Text style={s.fileName} numberOfLines={1}>{item.text}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ color: '#FFF' }}>{item.text}</Text>
                    )}
                  </View>
                );
              }}
            />

            <View style={s.chatInputRow}>
              <TouchableOpacity onPress={pickDocument} style={s.attachBtn}><FontAwesome5 name="paperclip" size={18} color={isPremium ? C.primary : C.textMuted} /></TouchableOpacity>
              <TextInput
                style={[s.chatInput, !isPremium && { opacity: 0.5 }]} value={message} onChangeText={setMessage}
                placeholder={isPremium ? "Mesaj yaz..." : "PRO Üyelik Gerekli 🔒"} placeholderTextColor={C.textMuted} editable={isPremium}
              />
              <TouchableOpacity onPress={sendMessage} disabled={!isPremium} style={s.sendBtn}>
                <LinearGradient colors={isPremium ? [C.primary, C.accent] : ['#475569', '#475569']} style={s.sendBtnGrad}><FontAwesome5 name={isPremium ? "paper-plane" : "lock"} size={14} color="#FFF" /></LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      <TouchableOpacity style={s.fab} onPress={toggleChat}><LinearGradient colors={[C.primary, C.accent]} style={s.fabGrad}><FontAwesome5 name="comment-dots" size={22} color={C.secondaryDark} /></LinearGradient></TouchableOpacity>
      
      <Modal visible={showPomodoroModal} transparent animationType="fade">
        <View style={s.modalOverlay}><View style={s.modalSheet}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Pomodoro Süresi</Text>
            {POMODORO_OPTIONS.map(o => (
              <TouchableOpacity key={o.minutes} onPress={() => startPomodoro(o.minutes)} style={s.modalOpt}><Text style={{ color: '#FFF' }}>{o.label}</Text></TouchableOpacity>
            ))}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bg },
  bgGlow: { position: 'absolute', top: -50, left: width / 2 - 150, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,193,7,0.06)' },
  scroll: { paddingHorizontal: 20, paddingTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  headerRoom: { fontSize: 12, color: C.primary, fontWeight: 'bold' },
  headerName: { fontSize: 26, fontWeight: '900', color: '#FFF' },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.amberDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  scoreText: { color: C.amber, fontWeight: 'bold' },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  statusCardActive: { borderColor: C.green, backgroundColor: 'rgba(16,185,129,0.1)' },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  statusDesc: { fontSize: 12, color: C.textMuted },
  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 11, color: C.textMuted, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  pomodoroCard: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 24, padding: 20, gap: 20, alignItems: 'center' },
  timerInner: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  pomSettingsBtn: { backgroundColor: C.surfaceHigh, padding: 10, borderRadius: 10, alignItems: 'center' },
  pomPlayBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  usersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10, backgroundColor: C.surface },
  userDot: { width: 8, height: 8, borderRadius: 4 },
  chatDrawer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.55, backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: C.border },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: C.border },
  chatTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginVertical: 4 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: C.myBubble, borderBottomRightRadius: 2 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: C.otherBubble, borderBottomLeftRadius: 2 },
  bubbleUser: { fontSize: 10, color: C.primary, fontWeight: 'bold', marginBottom: 4 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 12 },
  fileName: { color: '#FFF', fontSize: 12, flex: 1 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 10, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.border },
  chatInput: { flex: 1, height: 45, backgroundColor: C.surface, borderRadius: 22, paddingHorizontal: 15, color: '#FFF' },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnGrad: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { backgroundColor: '#1E293B', padding: 30, borderRadius: 20, width: '80%' },
  modalOpt: { padding: 15, borderBottomWidth: 1, borderColor: C.border, alignItems: 'center' }
});