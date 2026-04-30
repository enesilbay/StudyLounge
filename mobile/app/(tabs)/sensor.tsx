import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform 
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';

const SOCKET_URL = 'http://192.168.1.5:3000';

const COLORS = {
  deepIndigo: '#1A237E',
  amberGold: '#FFC107',
  success: '#10B981',
  white: '#FFFFFF',
  background: '#F8F9FA'
};

const AMBIENT_SOUNDS: { [key: string]: any } = {
  'Sessiz Kütüphane': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'Kafe Ortamı': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'default': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
};

export default function SensorScreen() {
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;
  
  const [totalScore, setTotalScore] = useState(Number(score) || 0);
  const [isAtDesk, setIsAtDesk] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Chat States
  const [message, setMessage] = useState('');
  const [chatList, setChatList] = useState<any[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const previousDeskState = useRef<boolean | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // 1. Atmosfer Sesi Hazırlığı[cite: 2]
  useEffect(() => {
    async function loadSound() {
      const soundUrl = AMBIENT_SOUNDS[roomName as string] || AMBIENT_SOUNDS['default'];
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: soundUrl },
        { shouldPlay: false, isLooping: true }
      );
      setSound(newSound);
    }
    loadSound();
    return () => { sound?.unloadAsync(); };
  }, [roomName]);

  // 2. Ses Kontrolü (Masadaysa çalıştır)[cite: 2]
  useEffect(() => {
    if (sound) {
      isAtDesk ? sound.playAsync() : sound.pauseAsync();
    }
  }, [isAtDesk, sound]);

  // 3. Socket, Sensör ve Chat Dinleyici[cite: 2]
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_lobby', { userId: id, roomName, fullName });
    });

    socketRef.current.on('score_updated', (data) => {
      if (data.userId === Number(id)) setTotalScore(data.newTotal);
    });

    // Yeni mesaj geldiğinde listeyi güncelle
    socketRef.current.on('receive_message', (data) => {
      setChatList((prev) => [...prev, data]);
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

  // Mesaj Gönderimi[cite: 2]
  const sendMessage = () => {
    if (message.trim() && socketRef.current) {
      socketRef.current.emit('send_message', {
        userId: Number(id),
        fullName,
        roomName,
        text: message
      });
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isAtDesk ? COLORS.success : COLORS.deepIndigo }]}
    >
      {/* Header Alanı */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Odaklanıyor: {fullName}</Text>
        <Text style={styles.lobby}>📍 {roomName}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>🔥 {totalScore} Puan</Text>
        </View>
      </View>
      
      {/* Sensör Durum Kartı */}
      <View style={styles.mainCard}>
        <FontAwesome5 
           name={isAtDesk ? "headset" : "mobile-alt"} 
           size={40} 
           color={isAtDesk ? COLORS.success : COLORS.deepIndigo} 
           style={{ marginBottom: 15 }}
        />
        <Text style={styles.statusText}>
          {isAtDesk ? 'Atmosfer Sesi Açık\nKeyifli Çalışmalar' : 'Telefonu Masaya Bırak\nAtmosfer Başlasın'}
        </Text>
      </View>

      {/* Global Chat Alanı[cite: 2] */}
      <View style={styles.chatSection}>
        <Text style={styles.chatTitle}>Lobi Sohbeti</Text>
        <FlatList
          ref={flatListRef}
          data={chatList}
          keyExtractor={(item, index) => index.toString()}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View style={[
              styles.msgBubble, 
              item.userId === Number(id) ? styles.myMsg : styles.otherMsg
            ]}>
              <Text style={styles.msgUser}>{item.fullName}</Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          )}
          style={styles.chatList}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Mesaj yaz..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <FontAwesome5 name="paper-plane" size={18} color={COLORS.amberGold} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 20 },
  welcome: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  lobby: { color: COLORS.amberGold, fontSize: 16, marginTop: 4, fontWeight: 'bold' },
  scoreBadge: { backgroundColor: COLORS.amberGold, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  scoreText: { fontWeight: 'bold', color: COLORS.deepIndigo },
  
  mainCard: { 
    backgroundColor: COLORS.white, 
    marginHorizontal: 40, 
    padding: 25, 
    borderRadius: 25, 
    alignItems: 'center', 
    elevation: 5,
    marginBottom: 20
  },
  statusText: { textAlign: 'center', fontWeight: 'bold', color: COLORS.deepIndigo, fontSize: 14, lineHeight: 20 },

  // Chat Stilleri
  chatSection: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 20 
  },
  chatTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepIndigo, marginBottom: 10 },
  chatList: { flex: 1 },
  msgBubble: { padding: 10, borderRadius: 15, marginBottom: 8, maxWidth: '80%' },
  myMsg: { alignSelf: 'flex-end', backgroundColor: 'rgba(26, 35, 126, 0.1)', borderBottomRightRadius: 2 },
  otherMsg: { alignSelf: 'flex-start', backgroundColor: '#EEE', borderBottomLeftRadius: 2 },
  msgUser: { fontSize: 10, fontWeight: 'bold', color: COLORS.deepIndigo, marginBottom: 2 },
  msgText: { fontSize: 14, color: '#333' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 15, height: 40, borderWidth: 1, borderColor: '#DDD' },
  sendBtn: { marginLeft: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.deepIndigo, alignItems: 'center', justifyContent: 'center' }
});