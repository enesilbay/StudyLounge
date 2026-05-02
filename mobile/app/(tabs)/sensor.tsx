import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  Dimensions, ScrollView, Modal, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client'; 
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SOCKET_URL = 'http://192.168.1.5:3000';
const { width, height } = Dimensions.get('window');

// ── Tema ──
const C = {
  bg: '#0F172A',               
  surface: 'rgba(255,255,255,0.05)', 
  surfaceHigh: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.1)',
  borderActive: '#FFC107',     
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

// ── Ortam Sesleri (Yerel MP3 Dosyaları) ──
const SOUNDS = [
  { key: 'library', label: 'Kütüphane', icon: 'book',       color: '#A78BFA', file: require('../../assets/sounds/library.mp3') },
  { key: 'rain',    label: 'Yağmur',    icon: 'cloud-rain', color: '#60A5FA', file: require('../../assets/sounds/rain.mp3') },
  { key: 'forest',  label: 'Doğa',      icon: 'leaf',       color: '#4ADE80', file: require('../../assets/sounds/nature.mp3') },
  { key: 'fire',    label: 'Şömine',    icon: 'fire',       color: '#FB923C', file: require('../../assets/sounds/fire.mp3') },
];

const POMODORO_OPTIONS = [
  { label: '15 dk', minutes: 15 },
  { label: '25 dk', minutes: 25 },
  { label: '45 dk', minutes: 45 },
  { label: '60 dk', minutes: 60 },
];

const pad = (n: number) => String(n).padStart(2, '0');

export default function SensorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;

  const safeFullName = typeof fullName === 'string' && fullName.trim() !== '' ? fullName : 'Öğrenci';

  const [totalScore, setTotalScore] = useState(Number(score) || 0);
  const [isAtDesk, setIsAtDesk] = useState(false);

  // Ortam Sesi State'leri
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0]);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);

  // Chat State'leri
  const [chatVisible, setChatVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatList, setChatList] = useState<any[]>([]);
  const chatAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const [roomUsers, setRoomUsers] = useState<any[]>([]);

  // Pomodoro State'leri
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
  }, []);

  // ── SES SİSTEMİ (AKILLI KONTROL) ──

  // 1. Dosya Seçildiğinde Arka Planda Yükle
  useEffect(() => {
    async function loadNewSound() {
      if (soundObj) {
        await soundObj.unloadAsync(); // Önceki sesi hafızadan sil
      }
      const { sound } = await Audio.Sound.createAsync(
        selectedSound.file, 
        { isLooping: true, volume: 1.0 } // Ses seviyesi %100 ve sonsuz döngü
      );
      setSoundObj(sound);
    }
    loadNewSound();

    return () => {
      soundObj?.unloadAsync(); // Sayfadan çıkınca sesi tamamen kapat
    };
  }, [selectedSound]);

  // 2. Oynat / Durdur Karar Mekanizması (Telefon masada mı?)
  useEffect(() => {
    if (soundObj) {
      if (isSoundOn && isAtDesk) {
        soundObj.playAsync();  // Kullanıcı sesi açmış VE telefon masadaysa -> ÇAL
      } else {
        soundObj.pauseAsync(); // Telefon elindeyse VEYA sesi kapattıysa -> DURDUR
      }
    }
  }, [isAtDesk, isSoundOn, soundObj]);

  // ── Pomodoro Mantığı ──
  useEffect(() => {
    if (pomodoroRunning) {
      pomTimerRef.current = setInterval(() => {
        setPomodoroSec((prev) => {
          if (prev <= 1) {
            clearInterval(pomTimerRef.current!);
            setPomodoroRunning(false);
            Animated.sequence([
              Animated.timing(pomAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
              Animated.spring(pomAnim, { toValue: 1, useNativeDriver: true }),
            ]).start();
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

  const togglePomodoro = () => {
    if (pomodoroSec === 0) {
      setPomodoroSec(pomodoroMinutes * 60);
      setPomodoroRunning(true);
    } else {
      setPomodoroRunning((v) => !v);
    }
  };

  const pomProgress = pomodoroSec / (pomodoroMinutes * 60);
  const pomMinutes = Math.floor(pomodoroSec / 60);
  const pomSeconds = pomodoroSec % 60;

  // ── Socket + Sensör ──
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

    socketRef.current.on('room_users', (users: any[]) => {
      setRoomUsers(users);
    });

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const isFlat = Math.abs(z) > 0.8 && Math.abs(x) < 0.3 && Math.abs(y) < 0.3;
      setIsAtDesk(isFlat);
      if (socketRef.current?.connected && isFlat !== previousDeskState.current) {
        socketRef.current.emit('update_presence', { userId: id, isAtDesk: isFlat, roomName });
        previousDeskState.current = isFlat;
      }
    });

    return () => {
      socketRef.current?.disconnect();
      subscription.remove();
    };
  }, []);

  // ── Chat Çekmecesi Animasyonu ──
  const toggleChat = () => {
    if (chatVisible) {
      Animated.timing(chatAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
        setChatVisible(false)
      );
    } else {
      setChatVisible(true);
      Animated.spring(chatAnim, { toValue: 1, tension: 90, friction: 14, useNativeDriver: true }).start();
    }
  };

  const chatTranslate = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.6, 0],
  });

  const sendMessage = () => {
    if (message.trim() && socketRef.current) {
      socketRef.current.emit('send_message', {
        userId: Number(id),
        fullName: safeFullName,
        roomName,
        text: message,
      });
      setMessage('');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.bgBase} />
        <View style={[s.bgGlow, isAtDesk && s.bgGlowGreen]} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { transform: [{ translateY: slideAnim }] }]}>
          <View>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 5 }}>
              <FontAwesome5 name="arrow-left" size={16} color={C.textMuted} />
            </TouchableOpacity>
            <Text style={s.headerRoom}>📍 {roomName}</Text>
            <Text style={s.headerName}>{safeFullName.split(' ')[0]}</Text>
          </View>
          <View style={s.scorePill}>
            <FontAwesome5 name="fire" size={13} color={C.amber} />
            <Text style={s.scoreText}>{totalScore}</Text>
          </View>
        </Animated.View>

        {/* ── DURUM KARTI ── */}
        <View style={[s.statusCard, isAtDesk && s.statusCardActive]}>
          <View style={[s.statusDot, isAtDesk && s.statusDotActive]} />
          <FontAwesome5
            name={isAtDesk ? 'headset' : 'mobile-alt'}
            size={28}
            color={isAtDesk ? C.green : C.textMuted}
          />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.statusTitle, isAtDesk && { color: C.green }]}>
              {isAtDesk ? 'Odaklanıyorsun' : 'Bekleniyor'}
            </Text>
            <Text style={s.statusDesc}>
              {isAtDesk ? 'Harika! Puan kazanmaya devam et.' : 'Telefonu masaya yüzüstü bırak.'}
            </Text>
          </View>
        </View>

        {/* ── POMODORO ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>POMODORO</Text>
          <View style={s.pomodoroCard}>
            <Animated.View style={[s.timerCircle, { transform: [{ scale: pomAnim }] }]}>
              <View style={[s.timerInner, pomodoroRunning && { borderColor: C.primary }, pomodoroSec === 0 && { borderColor: C.green }]}>
                <Text style={s.timerText}>{pad(pomMinutes)}:{pad(pomSeconds)}</Text>
                <Text style={s.timerSub}>
                  {pomodoroSec === 0 ? 'Mola!' : pomodoroRunning ? 'odaklanıyor' : 'bekliyor'}
                </Text>
              </View>
            </Animated.View>

            <View style={s.pomRight}>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${pomProgress * 100}%` }]} />
              </View>
              
              <View style={s.pomControls}>
                <TouchableOpacity style={s.pomSettingsBtn} onPress={() => setShowPomodoroModal(true)}>
                  <FontAwesome5 name="sliders-h" size={13} color={C.textSecondary} />
                  <Text style={s.pomSettingsText}>{pomodoroMinutes} dk</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={togglePomodoro} activeOpacity={0.85} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={pomodoroRunning ? ['#EF4444', '#DC2626'] : [C.primary, C.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.pomPlayBtn}
                  >
                    <FontAwesome5 name={pomodoroRunning ? 'pause' : 'play'} size={12} color={pomodoroRunning ? C.white : C.secondaryDark} />
                    <Text style={[s.pomPlayText, { color: pomodoroRunning ? C.white : C.secondaryDark }]}>
                      {pomodoroSec === 0 ? 'Yenile' : pomodoroRunning ? 'Durdur' : 'Başlat'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ── ORTAM SESLERİ ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>ORTAM SESİ</Text>
            <TouchableOpacity style={[s.soundToggle, isSoundOn && s.soundToggleOn]} onPress={() => setIsSoundOn(!isSoundOn)}>
              <FontAwesome5 name={isSoundOn ? 'volume-up' : 'volume-mute'} size={12} color={isSoundOn ? C.primary : C.textMuted} />
              <Text style={[s.soundToggleText, isSoundOn && { color: C.primary }]}>
                {isSoundOn ? 'Açık' : 'Kapalı'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {SOUNDS.map((snd) => {
              const active = selectedSound.key === snd.key;
              return (
                <TouchableOpacity key={snd.key} onPress={() => setSelectedSound(snd)} activeOpacity={0.8}>
                  <View style={[s.soundChip, active && { borderColor: C.primary, backgroundColor: C.amberDim }]}>
                    <FontAwesome5 name={snd.icon} size={18} color={active ? C.primary : C.textMuted} />
                    <Text style={[s.soundChipText, active && { color: C.primary }]}>{snd.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── ODADAKİ KİŞİLER ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ODADAKİ KİŞİLER</Text>
          <View style={s.usersWrap}>
            {roomUsers.length === 0 ? (
              <View style={s.userChip}>
                <View style={[s.userDot, { backgroundColor: isAtDesk ? C.green : C.textMuted }]} />
                <Text style={s.userChipText}>{safeFullName.split(' ')[0]}</Text>
              </View>
            ) : (
              roomUsers.map((u, i) => {
                const safeName = typeof u.fullName === 'string' && u.fullName ? u.fullName.split(' ')[0] : 'Öğrenci';
                return (
                  <View key={i} style={s.userChip}>
                    <View style={[s.userDot, { backgroundColor: u.isAtDesk ? C.green : C.textMuted }]} />
                    <Text style={s.userChipText} numberOfLines={1}>{safeName}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── CHAT DRAWER ── */}
      {chatVisible && (
        <Animated.View style={[s.chatDrawer, { transform: [{ translateY: chatTranslate }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={s.chatHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="comment-dots" size={16} color={C.textPrimary} />
                <Text style={s.chatTitle}>Lobi Sohbeti</Text>
              </View>
              <TouchableOpacity onPress={toggleChat} style={s.chatClose}>
                <FontAwesome5 name="times" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef}
              data={chatList}
              keyExtractor={(_, i) => i.toString()}
              style={s.chatList}
              contentContainerStyle={{ padding: 15, gap: 10 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                const isMe = item.userId === Number(id);
                const safeName = typeof item.fullName === 'string' && item.fullName ? item.fullName.split(' ')[0] : 'Misafir';
                return (
                  <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                    {!isMe && <Text style={s.bubbleUser}>{safeName}</Text>}
                    <Text style={s.bubbleText}>{item.text}</Text>
                  </View>
                );
              }}
            />

            <View style={s.chatInputRow}>
              <TextInput
                style={s.chatInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Mesaj yaz..."
                placeholderTextColor={C.textMuted}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={sendMessage} style={s.sendBtn} activeOpacity={0.8}>
                <LinearGradient colors={[C.primary, C.accent]} style={s.sendBtnGrad}>
                  <FontAwesome5 name="paper-plane" size={14} color={C.secondaryDark} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={[s.fab, chatVisible && s.fabClose]} onPress={toggleChat} activeOpacity={0.85}>
        <LinearGradient colors={chatVisible ? [C.surfaceHigh, C.surface] : [C.primary, C.accent]} style={s.fabGrad}>
          <FontAwesome5 name={chatVisible ? 'times' : 'comment-dots'} size={20} color={chatVisible ? C.white : C.secondaryDark} />
          {!chatVisible && chatList.length > 0 && (
            <View style={s.fabBadge}><Text style={s.fabBadgeText}>{chatList.length}</Text></View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* ── POMODORO MODALI ── */}
      <Modal visible={showPomodoroModal} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity style={mdl.overlay} activeOpacity={1} onPress={() => setShowPomodoroModal(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={mdl.sheet}>
              <View style={mdl.handle} />
              <Text style={mdl.title}>Pomodoro Süresi</Text>
              <Text style={mdl.sub}>Odaklanma hedefini belirle.</Text>
              <View style={mdl.grid}>
                {POMODORO_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.minutes}
                    style={[mdl.optBtn, pomodoroMinutes === opt.minutes && mdl.optBtnActive]}
                    onPress={() => startPomodoro(opt.minutes)}
                  >
                    <Text style={[mdl.optText, pomodoroMinutes === opt.minutes && mdl.optTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
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

  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 25, position: 'relative', overflow: 'hidden' },
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
  timerInner: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  timerText: { fontSize: 22, fontWeight: 'bold', color: C.textPrimary },
  timerSub: { fontSize: 9, color: C.textMuted, marginTop: 2, textTransform: 'uppercase' },
  pomRight: { flex: 1, gap: 15 },
  progressBar: { width: '100%', height: 6, backgroundColor: C.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.primary },
  pomControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pomSettingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surfaceHigh },
  pomSettingsText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  pomPlayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  pomPlayText: { fontSize: 13, fontWeight: 'bold' },

  soundToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  soundToggleOn: { borderColor: C.primary, backgroundColor: C.amberDim },
  soundToggleText: { fontSize: 12, color: C.textMuted, fontWeight: 'bold' },
  soundChip: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, width: 80, height: 85 },
  soundChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },

  usersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  userDot: { width: 8, height: 8, borderRadius: 4 },
  userChipText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },

  chatDrawer: { position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.55, backgroundColor: '#0F172A', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', elevation: 20 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: C.surfaceHigh },
  chatTitle: { fontSize: 16, fontWeight: 'bold', color: C.textPrimary },
  chatClose: { padding: 5 },
  chatList: { flex: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: C.myBubble, borderWidth: 1, borderColor: C.myBubbleBorder, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: C.otherBubble, borderWidth: 1, borderColor: C.otherBubbleBorder, borderBottomLeftRadius: 4 },
  bubbleUser: { fontSize: 11, color: C.primary, marginBottom: 4, fontWeight: 'bold' },
  bubbleText: { fontSize: 14, color: C.textPrimary, lineHeight: 20 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, gap: 10, borderTopWidth: 1, borderColor: C.surfaceHigh, backgroundColor: C.bg },
  chatInput: { flex: 1, height: 46, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 23, paddingHorizontal: 18, fontSize: 14, color: C.textPrimary },
  sendBtn: { borderRadius: 23, overflow: 'hidden' },
  sendBtnGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, overflow: 'hidden', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabClose: { shadowColor: '#000', elevation: 4 },
  fabGrad: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  fabBadge: { position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  fabBadgeText: { fontSize: 10, fontWeight: 'bold', color: C.white },
});

const mdl = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#1E293B', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 25, width: width - 50, alignItems: 'center', gap: 15 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  sub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  optBtn: { paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minWidth: 110, alignItems: 'center' },
  optBtnActive: { borderColor: '#FFC107', backgroundColor: 'rgba(255,193,7,0.15)' },
  optText: { fontSize: 16, fontWeight: 'bold', color: '#E2E8F0' },
  optTextActive: { color: '#FFC107' },
});