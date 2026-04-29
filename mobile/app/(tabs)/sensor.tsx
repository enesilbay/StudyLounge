import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';

const SOCKET_URL = 'http://192.168.1.5:3000';

// Lobiye göre atmosfer sesleri (Örnek URL'ler)
const AMBIENT_SOUNDS: { [key: string]: any } = {
  'Sessiz Kütüphane': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Örnek sesler
  'Kafe Ortamı': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'default': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
};

export default function SensorScreen() {
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;
  const [totalScore, setTotalScore] = useState(Number(score) || 0);
  const [isAtDesk, setIsAtDesk] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const previousDeskState = useRef<boolean | null>(null);

  // 1. Ses Dosyasını Hazırla
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

    return () => {
      sound?.unloadAsync();
    };
  }, [roomName]);

  // 2. Ses Kontrolü (Masadaysa çal, değilse dur)
  useEffect(() => {
    if (sound) {
      if (isAtDesk) {
        sound.playAsync();
      } else {
        sound.pauseAsync();
      }
    }
  }, [isAtDesk, sound]);

  // 3. Socket & Sensör (Önceki mantık aynı)
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_lobby', { userId: id, roomName, fullName });
    });
    socketRef.current.on('score_updated', (data) => {
      if (data.userId === Number(id)) setTotalScore(data.newTotal);
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

  return (
    <View style={[styles.container, { backgroundColor: isAtDesk ? '#10B981' : '#1A237E' }]}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Odaklanıyor: {fullName}</Text>
        <Text style={styles.lobby}>📍 {roomName}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>🔥 {totalScore} Puan</Text>
        </View>
      </View>
      
      <View style={styles.mainCard}>
        <FontAwesome5 
           name={isAtDesk ? "headset" : "mobile-alt"} 
           size={50} 
           color={isAtDesk ? "#10B981" : "#1A237E"} 
           style={{ marginBottom: 20 }}
        />
        <Text style={styles.statusText}>
          {isAtDesk ? 'Atmosfer Sesi Açık\nKeyifli Çalışmalar' : 'Telefonu Masaya Bırak\nAtmosfer Başlasın'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { position: 'absolute', top: 60, alignItems: 'center' },
  welcome: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  lobby: { color: '#FFC107', fontSize: 16, marginTop: 4, fontWeight: 'bold' },
  scoreBadge: { backgroundColor: '#FFC107', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 15 },
  scoreText: { fontWeight: 'bold', color: '#1A237E' },
  mainCard: { backgroundColor: '#FFF', padding: 40, borderRadius: 30, alignItems: 'center', elevation: 10, width: '80%' },
  statusText: { textAlign: 'center', fontWeight: 'bold', color: '#1A237E', fontSize: 16, lineHeight: 24 }
});