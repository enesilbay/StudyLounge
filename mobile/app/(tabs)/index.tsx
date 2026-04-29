import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

// Kendi yerel IP adresini buraya yazdığından emin ol
const BACKEND_URL = 'http://192.168.1.5:3000';

export default function AuthScreen() {
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // YENİ: Şifre state'i eklendi
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

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
          // GİRİŞ YAPILDIYSA: Sensör sayfasına git
          console.log('Giriş Başarılı:', user);
          // Giriş veya kayıt başarılı olduğunda:
        console.log('İşlem Başarılı:', user);
        
        // Sadece sayfaya gitme, kullanıcının verilerini de yanında götür!
        router.replace({
          pathname: '/lobbies' as any,
          params: { 
            id: user.id, 
            fullName: user.fullName, 
            score: user.totalFocusMinutes 
          }
        });
        } else {
          // KAYIT OLUNDUYSA: Modu değiştir ve giriş yapmasını iste
          Alert.alert('Başarılı! 🎉', 'Kaydınız oluşturuldu. Lütfen şimdi giriş yapın.');
          setIsLoginMode(true); // Giriş moduna geçir
          setFullName(''); // İsim alanını temizle
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

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.logoText}>StudyLounge</Text>
        <Text style={styles.subtitle}>
          {isLoginMode ? 'Tekrar Hoş Geldin! 👋' : 'Aramıza Katıl 🚀'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        
        {!isLoginMode && (
          <TextInput
            style={styles.input}
            placeholder="Adınız Soyadınız"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="E-posta Adresiniz"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* YENİ: Şifre Kutucuğu */}
        <TextInput
          style={styles.input}
          placeholder="Şifreniz"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={true} // Şifreyi *** şeklinde gizler
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
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

// ... Stiller (styles) bir öncekiyle tamamen aynı kalacak
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: '900', color: '#1E1B4B', letterSpacing: 1 },
  subtitle: { fontSize: 18, color: '#6B7280', marginTop: 8, fontWeight: '500' },
  formContainer: { backgroundColor: '#FFF', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, color: '#1F2937' },
  button: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  switchModeButton: { marginTop: 20, alignItems: 'center' },
  switchModeText: { color: '#4F46E5', fontSize: 15, fontWeight: '600' }
});