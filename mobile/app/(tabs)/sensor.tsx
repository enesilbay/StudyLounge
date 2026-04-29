import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { Accelerometer } from 'expo-sensors';

const SOCKET_URL = 'http://192.168.1.5:3000';

export default function App() {
  const [status, setStatus] = useState<string>('Bağlanıyor... ⏳');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAtDesk, setIsAtDesk] = useState<boolean>(false);

  // Telefonun bir önceki durumunu hafızada tutarız (aynı veriyi saniyede bir göndermemek için)
  const previousDeskState = useRef<boolean | null>(null);

  useEffect(() => {
    // 1. Backend Bağlantısı
    const newSocket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => setStatus('Sunucuya Bağlandı! 🟢'));
    newSocket.on('disconnect', () => setStatus('Bağlantı Koptu 🔴'));
    setSocket(newSocket);

    // 2. İvmeölçer (Sensör) Ayarları
    Accelerometer.setUpdateInterval(1000); // Saniyede sadece 1 kez kontrol et (Batarya dostu)

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Formül: Z ekseni 0.8'den büyük (yerçekimi kuvvetli) VE X, Y eksenleri 0.3'ten küçük (eğim yok)
      const isFlat = Math.abs(z) > 0.8 && Math.abs(x) < 0.3 && Math.abs(y) < 0.3;

      setIsAtDesk(isFlat);

      // 3. Durum DEĞİŞTİYSE backend'e canlı sinyal gönder
      if (newSocket.connected && isFlat !== previousDeskState.current) {
        console.log(`Durum değişti. Masada mı? : ${isFlat}`);
        
        newSocket.emit('update_presence', {
          userId: 1, // Şimdilik test kullanıcımız
          isAtDesk: isFlat,
          roomName: 'kütüphane',
        });
        
        previousDeskState.current = isFlat; // Yeni durumu hafızaya al
      }
    });

    // Uygulama kapanırsa her şeyi temizle
    return () => {
      newSocket.disconnect();
      subscription.remove();
    };
  }, []);

  return (
    // Telefon masadaysa arka plan yeşil (odak), elindeyse kırmızı (dikkat dağınık) olur
    <View style={[styles.container, { backgroundColor: isAtDesk ? '#10B981' : '#EF4444' }]}>
      <Text style={styles.title}>StudyLounge Sensör</Text>
      <Text style={styles.status}>{status}</Text>

      <View style={styles.card}>
        <Text style={styles.deskStatus}>
          {isAtDesk ? '📚 ŞU AN MASADA (ODAKLANILDI)' : '📱 TELEFON ELDE (DİKKAT DAĞINIK)'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFF',
  },
  status: {
    fontSize: 16,
    marginBottom: 40,
    color: '#FFF',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  deskStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1B4B',
    textAlign: 'center',
  },
});