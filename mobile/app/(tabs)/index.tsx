import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';

// Marka Kimliği Renkleri[cite: 1]
const COLORS = {
  deepIndigo: '#1A237E',
  amberGold: '#FFC107',
  background: '#F8F9FA',
  white: '#FFFFFF',
  textMuted: '#6B7280'
};

const BACKEND_URL = 'http://192.168.1.5:3000';

export default function AuthScreen() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // "Beni Hatırla" kontrol state'i

  // 1. UYGULAMA AÇILDIĞINDA: Hafızayı Kontrol Et
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user_data');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          // Kayıtlı veri varsa, bekletmeden Lobi ekranına at
          router.replace({
            pathname: '/lobbies' as any,
            params: { 
              id: userData.id, 
              fullName: userData.fullName, 
              score: userData.score 
            }
          });
        } else {
          setIsCheckingAuth(false); // Kayıt yoksa formu göster
        }
      } catch (error) {
        setIsCheckingAuth(false);
      }
    };
    
    checkLoginStatus();
  }, []);

  const handleSubmit = async () => {
    if (!email || !password || (!isLoginMode && !fullName)) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLoginMode ? '/users/login' : '/users/register';
      const bodyData = isLoginMode 
        ? { email, password } 
        : { fullName, email, password, isPremium: false };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        const user = await response.json();
        
        if (isLoginMode) {
          // 2. GİRİŞ BAŞARILI: Verileri Hafızaya Kaydet
          const userDataToSave = {
            id: user.id,
            fullName: user.fullName,
            score: user.totalFocusMinutes || 0
          };
          await AsyncStorage.setItem('user_data', JSON.stringify(userDataToSave));

          router.replace({
            pathname: '/lobbies' as any,
            params: userDataToSave
          });
        } else {
          // KAYIT BAŞARILI: Giriş moduna geçir
          Alert.alert('Başarılı! 🎉', 'Kaydınız oluşturuldu. Lütfen şimdi giriş yapın.');
          setIsLoginMode(true); 
          setFullName(''); 
          setPassword(''); // Güvenlik için şifreyi temizle
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Hata', errorData.message || 'Bir sorun oluştu.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Hafıza kontrol edilirken gösterilecek ekran
  if (isCheckingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.deepIndigo} />
        <Text style={{ marginTop: 15, color: COLORS.deepIndigo, fontWeight: 'bold' }}>
          StudyLounge Yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <FontAwesome5 name="book-reader" size={50} color={COLORS.amberGold} style={{ marginBottom: 15 }} />
        <Text style={styles.logoText}>StudyLounge</Text>
        <Text style={styles.subtitle}>
          {isLoginMode ? 'Ayrı Masalarda, Aynı Lobide.' : 'Akademik Ağına Katıl.'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        
        {!isLoginMode && (
          <TextInput
            style={styles.input}
            placeholder="Adınız Soyadınız"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="E-posta Adresiniz"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Şifreniz"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={true} 
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.deepIndigo} />
          ) : (
            <Text style={styles.buttonText}>
              {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchModeButton}
          onPress={() => setIsLoginMode(!isLoginMode)}
        >
          <Text style={styles.switchModeText}>
            {isLoginMode 
              ? 'Hesabın yok mu? Yeni kayıt oluştur.' 
              : 'Zaten hesabın var mı? Giriş yap.'}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 34, fontWeight: '900', color: COLORS.deepIndigo, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginTop: 8, fontWeight: '500' },
  
  formContainer: { 
    backgroundColor: COLORS.white, 
    padding: 24, 
    borderRadius: 20, 
    elevation: 8,
    shadowColor: COLORS.deepIndigo, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10 
  },
  
  input: { 
    backgroundColor: '#F3F4F6', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    fontSize: 16, 
    color: '#1F2937' 
  },
  
  button: { 
    backgroundColor: COLORS.amberGold, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 8 
  },
  buttonText: { color: COLORS.deepIndigo, fontSize: 18, fontWeight: 'bold' },
  
  switchModeButton: { marginTop: 20, alignItems: 'center' },
  switchModeText: { color: COLORS.deepIndigo, fontSize: 15, fontWeight: '600', opacity: 0.8 }
});