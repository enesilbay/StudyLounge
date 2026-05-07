import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Animated, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const BACKEND_URL = "http://10.192.24.96:3000";
const { width } = Dimensions.get('window');

import { C } from './sensor';

// ── ANİMASYONLU INPUT BİLEŞENİ ──
function InputField({
  placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, iconName,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  iconName: string;
}) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.primary],
  });
  
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.surface, C.surfaceHigh],
  });

  return (
    <Animated.View style={[field.wrap, { borderColor, backgroundColor: bgColor }]}>
      <View style={field.iconWrap}>
        <FontAwesome5 
          name={iconName} 
          size={16} 
          color={focused ? C.primary : C.textMuted} 
        />
      </View>
      <TextInput
        style={field.input}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Animated.View>
  );
}

// ── ANA EKRAN ──
export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState(''); // YENİ: Kullanıcı Adı State'i

  // Giriş Animasyonları
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
    checkExistingLogin();
  }, []);

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    Animated.spring(tabAnim, {
      toValue: toLogin ? 0 : 1,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
  };

  const checkExistingLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        router.replace({ pathname: '/lobbies' as any, params: parsed });
      }
    } catch (e) {}
  };

  const handleAuth = async () => {
    // Boş alan kontrolü
    if (!email || !password || (!isLogin && (!fullName || !username))) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    // Kayıt olurken Kullanıcı Adı kural kontrolü (Boşluk yok, özel karakter yok)
    if (!isLogin) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        Alert.alert('Geçersiz Kullanıcı Adı', 'Kullanıcı adında boşluk veya özel karakter olamaz. Sadece harf, rakam ve alt çizgi (_) kullanın.');
        return;
      }
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email, password } : { username, fullName, email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user)); 
        await AsyncStorage.setItem('access_token', data.access_token);
        router.replace({ pathname: '/lobbies' as any, params: data.user });
      } else {
        Alert.alert('Hata', data.message || 'Bir sorun oluştu.');
      }
    } catch {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sekme Seçici Kaydırma Ayarı
  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  return (
    <SafeAreaView style={s.safe}>
      {/* Koyu Arka Plan */}
      <View style={StyleSheet.absoluteFill}>
        <View style={s.bgBase} />
        <View style={s.bgGlow} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* LOGO */}
            <View style={s.logoContainer}>
              <Image 
                source={require('../../assets/images/logo-light.png')} 
                style={s.logo} 
                resizeMode="contain" 
              />
            </View>

            {/* SEKME (TAB) SEÇİCİ */}
            <View style={s.tabContainer}>
              <Animated.View style={[s.tabIndicator, { left: tabIndicatorLeft }]} />
              <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(true)} activeOpacity={0.8}>
                <Text style={[s.tabText, isLogin && s.tabTextActive]}>Giriş Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(false)} activeOpacity={0.8}>
                <Text style={[s.tabText, !isLogin && s.tabTextActive]}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            {/* FORM ALANLARI */}
            <View style={s.form}>
              {!isLogin && (
                <>
                  <InputField
                    placeholder="Ad Soyad"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    iconName="address-card" // İkon güncellendi
                  />
                  <InputField
                    placeholder="Kullanıcı Adı"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    iconName="user" // Kullanıcı adı için ikon eklendi
                  />
                </>
              )}
              <InputField
                placeholder="E-posta adresi"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                iconName="envelope"
              />
              <InputField
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                iconName="lock"
              />

              {/* BUTON */}
              <TouchableOpacity onPress={handleAuth} disabled={isLoading} activeOpacity={0.85} style={{ marginTop: 15 }}>
                <LinearGradient
                  colors={[C.primary, C.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.secondary} />
                  ) : (
                    <>
                      <Text style={s.btnText}>{isLogin ? 'GİRİŞ YAP' : 'KAYIT OL'}</Text>
                      <FontAwesome5 solid name="arrow-right" size={14} color={C.secondary} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ALT YÖNLENDİRME METNİ */}
            <TouchableOpacity style={s.switchRow} onPress={() => switchTab(!isLogin)} activeOpacity={0.7}>
              <Text style={s.switchText}>
                {isLogin ? 'Hesabın yok mu?  ' : 'Zaten üye misin?  '}
                <Text style={s.switchAction}>
                  {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
                </Text>
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STİLLER
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bg },
  bgGlow: {
    position: 'absolute',
    top: -100,
    left: width / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 193, 7, 0.08)', 
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 35,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 190,
    height: 75,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 5,
    marginBottom: 25,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: '48%',
    borderRadius: 12,
    backgroundColor: C.surfaceHigh,
    borderColor: C.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', zIndex: 1 },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
  },
  tabTextActive: { 
    color: C.primary, 
    fontWeight: '800' 
  },
  form: { gap: 14 },
  btn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: C.secondaryDark,
    letterSpacing: 1.2,
  },
  switchRow: { marginTop: 25, alignItems: 'center' },
  switchText: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: '500',
  },
  switchAction: {
    color: C.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

const field = StyleSheet.create({
  wrap: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
    marginLeft: 5,
  },
});

