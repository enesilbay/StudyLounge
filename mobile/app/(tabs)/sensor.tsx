import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  Dimensions, ScrollView, Modal, StatusBar, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client'; 
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://192.168.1.5:3000';
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
  greenDim: 'rgba(16,185,129,0.12)',
  greenBorder: 'rgba(16,185,129,0.3)',
  amber: '#FFC107',
  amberDim: 'rgba(255,193,7,0.15)',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
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
      const formattedData = data.map((m: any) => ({
        userId: m.user?.id,
        fullName: m.user?.fullName || 'Bilinmeyen',
        text: m.text,
        isPremium: m.user?.isPremium || false
      }));
      setChatList(formattedData);
    } catch (e) {
      console.error("Geçmiş yüklenemedi");
    }
  };

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

  useEffect(() => {
    if (pomodoroRunning) {
      pomTimerRef.current = setInterval(() => {
        setPomodoroSec((prev) => {
          if (prev <= 1) {
            clearInterval(pomTimerRef.current!);
            setPomodoroRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomTimerRef.current) clearInterval(pomTimerRef.current);
    }
    return () => { if (pomTimerRef.current) clearInterval(pomTimerRef.current); };
  }, [pomodoroRunning]);

  const startPomodoro = (minutes: number) => {
    setPomodoroMinutes(minutes);
    setPomodoroSec(minutes * 60);
    setPomodoroRunning(true);
    setShowPomodoroModal(false);
  };

  const togglePomodoro = () => pomodoroSec === 0 ? startPomodoro(pomodoroMinutes) : setPomodoroRunning((v) => !v);

  const pomProgress = pomodoroSec / (pomodoroMinutes * 60);
  const pomMinutes = Math.floor(pomodoroSec / 60);
  const pomSeconds = pomodoroSec % 60;

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_lobby', { userId: id, roomName, fullName: safeFullName });
    });

    socketRef.current.on('score_updated', (data: any) => {
      if (data.userId === Number(id)) setTotalScore(data.newTotal);
    });

    socketRef.current.on('receive_message', (data: any) => {
      setChatList((prev) => [...prev, data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socketRef.current.on('room_users', (users: any[]) => setRoomUsers(users));

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const isFlat = Math.abs(z) > 0.8 && Math.abs(x) < 0.3 && Math.abs(y) < 0.3;
      setIsAtDesk(isFlat);
      if (socketRef.current?.connected && isFlat !== previousDeskState.current) {
        socketRef.current.emit('update_presence', { userId: id, isAtDesk: isFlat, roomName });
        previousDeskState.current = isFlat;
      }
    });

    return () => { socketRef.current?.disconnect(); subscription.remove(); };
  }, []);

  const toggleChat = () => {
    if (chatVisible) {
      Animated.timing(chatAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setChatVisible(false));
    } else {
      setChatVisible(true);
      Animated.spring(chatAnim, { toValue: 1, tension: 90, friction: 14, useNativeDriver: true }).start();
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !isPremium) return;

    if (socketRef.current) {
      try {
        await fetch(`${SOCKET_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message, roomName, userId: myUserId }),
        });

        socketRef.current.emit('send_message', {
          userId: myUserId, fullName: safeFullName, roomName, text: message, isPremium: isPremium
        });
        setMessage('');
      } catch (e) {
        Alert.alert("Hata", "Mesaj iletilemedi.");
      }
    }
  };

  const chatTranslate = chatAnim.interpolate({
    inputRange: [0, 1], outputRange: [height * 0.6, 0],
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.bgBase} />
        <View style={[s.bgGlow, isAtDesk && s.bgGlowGreen]} />
      </View>

      <Animated.ScrollView style={{ flex: 1, opacity: fadeAnim }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <Animated.View style={[s.header, { transform: [{ translateY: slideAnim }] }]}>
          <View>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 5 }}>
              <FontAwesome5 name="arrow-left" size={16} color={C.textMuted} />
            </TouchableOpacity>
            <Text style={s.headerRoom}>📍 {roomName}</Text>
            <Text style={s.headerName}>{safeFullName.split(' ')[0]}</Text>
          </View>
          <View style={s.scorePill}>
            <FontAwesome5 name="fire" size={13} color={C.amber} /><Text style={s.scoreText}>{totalScore}</Text>
          </View>
        </Animated.View>

        {/* DURUM KARTI */}
        <View style={[s.statusCard, isAtDesk && s.statusCardActive]}>
          <View style={[s.statusDot, isAtDesk && s.statusDotActive]} />
          <FontAwesome5 name={isAtDesk ? 'headset' : 'mobile-alt'} size={28} color={isAtDesk ? C.green : C.textMuted} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.statusTitle, isAtDesk && { color: C.green }]}>{isAtDesk ? 'Odaklanıyorsun' : 'Bekleniyor'}</Text>
            <Text style={s.statusDesc}>{isAtDesk ? 'Harika! Puan kazanmaya devam et.' : 'Telefonu masaya yüzüstü bırak.'}</Text>
          </View>
        </View>

        {/* POMODORO VE DİĞER SEKSİYONLAR... */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>POMODORO</Text>
          <View style={s.pomodoroCard}>
            <Animated.View style={[s.timerCircle, { transform: [{ scale: pomAnim }] }]}>
              <View style={[s.timerInner, pomodoroRunning && { borderColor: C.primary }, pomodoroSec === 0 && { borderColor: C.green }]}>
                <Text style={s.timerText}>{pad(pomMinutes)}:{pad(pomSeconds)}</Text>
                <Text style={s.timerSub}>{pomodoroSec === 0 ? 'Mola!' : pomodoroRunning ? 'odaklanıyor' : 'bekliyor'}</Text>
              </View>
            </Animated.View>
            <View style={s.pomRight}>
              <View style={s.progressBar}><View style={[s.progressFill, { width: `${pomProgress * 100}%` }]} /></View>
              <View style={s.pomControls}>
                <TouchableOpacity style={s.pomSettingsBtn} onPress={() => setShowPomodoroModal(true)}>
                  <FontAwesome5 name="sliders-h" size={13} color={C.textSecondary} /><Text style={s.pomSettingsText}>{pomodoroMinutes} dk</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePomodoro} activeOpacity={0.85} style={{ flex: 1 }}>
                  <LinearGradient colors={pomodoroRunning ? ['#EF4444', '#DC2626'] : [C.primary, C.accent]} style={s.pomPlayBtn}>
                    <FontAwesome5 name={pomodoroRunning ? 'pause' : 'play'} size={12} color={C.white} /><Text style={[s.pomPlayText, { color: C.white }]}>{pomodoroSec === 0 ? 'Yenile' : pomodoroRunning ? 'Durdur' : 'Başlat'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>ORTAM SESİ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {SOUNDS.map((snd) => (
              <TouchableOpacity key={snd.key} onPress={() => setSelectedSound(snd)}>
                <View style={[s.soundChip, selectedSound.key === snd.key && { borderColor: C.primary, backgroundColor: C.amberDim }]}>
                  <FontAwesome5 name={snd.icon} size={18} color={selectedSound.key === snd.key ? C.primary : C.textMuted} />
                  <Text style={[s.soundChipText, selectedSound.key === snd.key && { color: C.primary }]}>{snd.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>ODADAKİ KİŞİLER</Text>
          <View style={s.usersWrap}>
            {roomUsers.map((u, i) => (
              <View key={i} style={s.userChip}>
                <View style={[s.userDot, { backgroundColor: u.isAtDesk ? C.green : C.textMuted }]} />
                <Text style={s.userChipText}>{u.fullName?.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* CHAT DRAWER */}
      {chatVisible && (
        <Animated.View style={[s.chatDrawer, { transform: [{ translateY: chatTranslate }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={s.chatHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="comment-dots" size={16} color={C.textPrimary} /><Text style={s.chatTitle}>Lobi Sohbeti</Text>
                {!isPremium && <FontAwesome5 name="lock" size={12} color={C.amber} />}
              </View>
              <TouchableOpacity onPress={toggleChat}><FontAwesome5 name="times" size={16} color={C.textMuted} /></TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef} data={chatList} keyExtractor={(_, i) => i.toString()} style={s.chatList} contentContainerStyle={{ padding: 15, gap: 10 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                const isMe = item.userId === myUserId;
                return (
                  <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                    {!isMe && <Text style={s.bubbleUser}>{item.fullName?.split(' ')[0]} {item.isPremium ? '✨' : ''}</Text>}
                    <Text style={s.bubbleText}>{item.text}</Text>
                  </View>
                );
              }}
            />

            {/* 👇 BURASI GÜNCELLENDİ: PRO KONTROLÜ SERTLEŞTİRİLDİ 👇 */}
            <View style={s.chatInputRow}>
              <TextInput
                style={[s.chatInput, !isPremium && { opacity: 0.6, backgroundColor: 'rgba(0,0,0,0.1)' }]}
                value={message} onChangeText={setMessage}
                placeholder={isPremium ? "Mesaj yaz..." : "Mesaj yazmak için PRO olmalısın 🔒"}
                placeholderTextColor={C.textMuted}
                onSubmitEditing={sendMessage} returnKeyType="send"
                editable={isPremium}
              />
              <TouchableOpacity onPress={sendMessage} style={s.sendBtn} disabled={!isPremium}>
                <LinearGradient colors={isPremium ? [C.primary, C.accent] : ['#475569', '#475569']} style={s.sendBtnGrad}>
                  <FontAwesome5 name={isPremium ? "paper-plane" : "lock"} size={14} color={C.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      <TouchableOpacity style={s.fab} onPress={toggleChat}>
        <LinearGradient colors={chatVisible ? [C.surfaceHigh, C.surface] : [C.primary, C.accent]} style={s.fabGrad}>
          <FontAwesome5 name={chatVisible ? 'times' : 'comment-dots'} size={20} color={chatVisible ? C.white : C.secondaryDark} />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* POMODORO MODAL... */}
      <Modal visible={showPomodoroModal} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity style={mdl.overlay} activeOpacity={1} onPress={() => setShowPomodoroModal(false)}>
          <View style={mdl.sheet}>
            <View style={mdl.handle} />
            <Text style={mdl.title}>Pomodoro Süresi</Text>
            <View style={mdl.grid}>
              {POMODORO_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.minutes} style={[mdl.optBtn, pomodoroMinutes === opt.minutes && mdl.optBtnActive]} onPress={() => startPomodoro(opt.minutes)}>
                  <Text style={[mdl.optText, pomodoroMinutes === opt.minutes && mdl.optTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bg },
  bgGlow: { position: 'absolute', top: -50, left: width / 2 - 150, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,193,7,0.06)' },
  bgGlowGreen: { backgroundColor: 'rgba(16,185,129,0.08)' },
  scroll: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  headerRoom: { fontSize: 12, color: C.primary, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  headerName: { fontSize: 26, fontWeight: '900', color: C.textPrimary },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.amberDim, borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  scoreText: { fontSize: 15, fontWeight: 'bold', color: C.amber },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 25 },
  statusCardActive: { borderColor: C.greenBorder, backgroundColor: C.greenDim },
  statusDot: { position: 'absolute', top: 16, right: 16, width: 10, height: 10, borderRadius: 5, backgroundColor: C.textMuted },
  statusDotActive: { backgroundColor: C.green },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: C.textPrimary },
  statusDesc: { fontSize: 13, color: C.textMuted, marginTop: 4 },
  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 11, color: C.textMuted, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pomodoroCard: { flexDirection: 'row', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 20, alignItems: 'center', gap: 20 },
  timerCircle: { alignItems: 'center' },
  timerInner: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 22, fontWeight: 'bold', color: C.textPrimary },
  timerSub: { fontSize: 9, color: C.textMuted, marginTop: 2, textTransform: 'uppercase' },
  pomRight: { flex: 1, gap: 15 },
  progressBar: { width: '100%', height: 6, backgroundColor: C.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.primary },
  pomControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pomSettingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surfaceHigh },
  pomSettingsText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  pomPlayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, flex: 1 },
  pomPlayText: { fontSize: 13, fontWeight: 'bold' },
  soundChip: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, width: 80, height: 85 },
  soundChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  usersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  userDot: { width: 8, height: 8, borderRadius: 4 },
  userChipText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  chatDrawer: { position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.55, backgroundColor: '#0F172A', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: C.surfaceHigh },
  chatTitle: { fontSize: 16, fontWeight: 'bold', color: C.textPrimary },
  chatList: { flex: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginVertical: 4 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: C.myBubble, borderWidth: 1, borderColor: C.myBubbleBorder, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: C.otherBubble, borderWidth: 1, borderColor: C.otherBubbleBorder, borderBottomLeftRadius: 4 },
  bubbleUser: { fontSize: 11, color: C.primary, marginBottom: 4, fontWeight: 'bold' },
  bubbleText: { fontSize: 14, color: C.textPrimary, lineHeight: 20 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, gap: 10, borderTopWidth: 1, borderColor: C.surfaceHigh, backgroundColor: C.bg },
  chatInput: { flex: 1, height: 46, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 23, paddingHorizontal: 18, fontSize: 14, color: C.textPrimary },
  sendBtn: { borderRadius: 23, overflow: 'hidden' },
  sendBtnGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, overflow: 'hidden', elevation: 8 },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const mdl = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#1E293B', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 25, width: width - 50, alignItems: 'center', gap: 15 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  optBtn: { paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minWidth: 110, alignItems: 'center' },
  optBtnActive: { borderColor: '#FFC107', backgroundColor: 'rgba(255,193,7,0.15)' },
  optText: { fontSize: 16, fontWeight: 'bold', color: '#E2E8F0' },
  optTextActive: { color: '#FFC107' },
});