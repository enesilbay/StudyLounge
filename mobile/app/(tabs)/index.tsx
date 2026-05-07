import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Animated, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const BACKEND_URL = "http://10.192.24.96:3000";
const { width, height } = Dimensions.get('window');

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
  // Renk animasyonu (useNativeDriver: false zorunlu)
  const colorAnim = useRef(new Animated.Value(0)).current;
  // Scale animasyonu (useNativeDriver: true - ayrı değer)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(colorAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
    Animated.spring(scaleAnim, { toValue: focused ? 1.01 : 1, tension: 120, friction: 8, useNativeDriver: true }).start();
  }, [focused]);

  const borderColor = colorAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.08)', C.primary] });
  const bgColor = colorAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.04)', 'rgba(255,193,7,0.08)'] });

  return (
    <Animated.View style={[field.wrap, { borderColor, backgroundColor: bgColor }]}>
      <Animated.View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center' }, { transform: [{ scale: scaleAnim }] }]}>
        <View style={field.iconWrap}>
          <FontAwesome5 name={iconName} size={15} color={focused ? C.primary : 'rgba(255,255,255,0.3)'} solid />
        </View>
        <TextInput
          style={field.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Animated.View>
    </Animated.View>
  );
}

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

// ── ANA EKRAN ──
export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const formSlide = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
    checkExistingLogin();
  }, []);

  const switchTab = (toLogin: boolean) => {
    Animated.sequence([
      Animated.timing(formSlide, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.spring(formSlide, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
    ]).start();
    setIsLogin(toLogin);
  };

  const checkExistingLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        router.replace({ pathname: '/lobbies' as any, params: parsed });
      }
    } catch (e) { }
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && (!fullName || !username))) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (!isLogin) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        Alert.alert('Geçersiz Kullanıcı Adı', 'Sadece harf, rakam ve alt çizgi (_) kullanın.');
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

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* DEKORATIF ARKAPLAN */}
      <BackgroundOrbs />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* LOGO & BAŞLIK */}
            <Animated.View style={[s.heroSection, { transform: [{ scale: logoScale }] }]}>
              {/* Logo İkonu */}
              <LinearGradient
                colors={['rgba(255,193,7,0.2)', 'rgba(255,193,7,0.05)']}
                style={s.logoCircle}
              >
                <LinearGradient colors={[C.primary, '#E6A800']} style={s.logoInner}>
                  <FontAwesome5 solid name="brain" size={30} color="#1A0F00" />
                </LinearGradient>
              </LinearGradient>

              <Text style={s.appName}>StudyLounge</Text>
              <Text style={s.tagline}>Ayrı Masalarda,Aynı Lobide</Text>
            </Animated.View>

            {/* KART */}
            <Animated.View style={[s.card, { transform: [{ translateY: formSlide }] }]}>

              {/* SEKME SEÇİCİ */}
              <View style={s.tabContainer}>
                <TouchableOpacity
                  style={[s.tabBtn, isLogin && s.tabBtnActive]}
                  onPress={() => switchTab(true)}
                  activeOpacity={0.8}
                >
                  {isLogin && <LinearGradient colors={['rgba(255,193,7,0.15)', 'rgba(255,193,7,0.05)']} style={StyleSheet.absoluteFill} />}
                  <FontAwesome5 solid name="sign-in-alt" size={13} color={isLogin ? C.primary : 'rgba(255,255,255,0.3)'} style={{ marginRight: 7 }} />
                  <Text style={[s.tabText, isLogin && s.tabTextActive]}>Giriş Yap</Text>
                </TouchableOpacity>

                <View style={s.tabDivider} />

                <TouchableOpacity
                  style={[s.tabBtn, !isLogin && s.tabBtnActive]}
                  onPress={() => switchTab(false)}
                  activeOpacity={0.8}
                >
                  {!isLogin && <LinearGradient colors={['rgba(255,193,7,0.15)', 'rgba(255,193,7,0.05)']} style={StyleSheet.absoluteFill} />}
                  <FontAwesome5 solid name="user-plus" size={13} color={!isLogin ? C.primary : 'rgba(255,255,255,0.3)'} style={{ marginRight: 7 }} />
                  <Text style={[s.tabText, !isLogin && s.tabTextActive]}>Kayıt Ol</Text>
                </TouchableOpacity>
              </View>

              {/* FORM */}
              <View style={s.form}>
                {!isLogin && (
                  <>
                    <InputField placeholder="Ad Soyad" value={fullName} onChangeText={setFullName} autoCapitalize="words" iconName="user-circle" />
                    <InputField placeholder="Kullanıcı Adı (örn: enes_123)" value={username} onChangeText={setUsername} iconName="at" />
                  </>
                )}
                <InputField placeholder="E-posta adresi" value={email} onChangeText={setEmail} keyboardType="email-address" iconName="envelope" />
                <InputField placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry iconName="lock" />

                {/* GİRİŞ BUTONU */}
                <TouchableOpacity onPress={handleAuth} disabled={isLoading} activeOpacity={0.85} style={s.btnWrap}>
                  <LinearGradient
                    colors={isLoading ? ['#475569', '#334155'] : [C.primary, '#E6A800', C.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#1A0F00" />
                    ) : (
                      <>
                        <Text style={s.btnText}>{isLogin ? 'GİRİŞ YAP' : 'HESAP OLUŞTUR'}</Text>
                        <View style={s.btnArrow}>
                          <FontAwesome5 solid name="arrow-right" size={12} color={C.primary} />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ALT METİN */}
              <TouchableOpacity style={s.switchRow} onPress={() => switchTab(!isLogin)} activeOpacity={0.7}>
                <Text style={s.switchText}>
                  {isLogin ? 'Henüz hesabın yok mu?  ' : 'Zaten üye misin?  '}
                  <Text style={s.switchAction}>{isLogin ? 'Kayıt Ol →' : 'Giriş Yap →'}</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ALT ÖZELLIK BANERLERİ */}
            <View style={s.features}>
              {[
                { icon: 'users', text: 'Çalışma Odaları' },
                { icon: 'fire', text: 'Puan Sistemi' },
                { icon: 'music', text: 'Atmosfer Sesi' },
              ].map((f) => (
                <View key={f.text} style={s.featureChip}>
                  <FontAwesome5 solid name={f.icon} size={11} color={C.primary} />
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>

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
  safe: { flex: 1, backgroundColor: '#080C14' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 30 },
  content: { width: '100%', maxWidth: 420, alignItems: 'center' },

  heroSection: { alignItems: 'center', marginBottom: 36 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
  logoInner: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  appName: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, marginBottom: 6 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '500', letterSpacing: 0.3 },

  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
  },

  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 24, overflow: 'hidden' },
  tabBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 10 },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  tabTextActive: { color: C.primary, fontWeight: '800' },

  form: { gap: 13 },

  btnWrap: { marginTop: 6 },
  btn: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { fontSize: 15, fontWeight: '900', color: '#1A0F00', letterSpacing: 1.5 },
  btnArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(26,15,0,0.3)', alignItems: 'center', justifyContent: 'center' },

  switchRow: { marginTop: 22, alignItems: 'center' },
  switchText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  switchAction: { color: C.primary, fontWeight: '800' },

  features: { flexDirection: 'row', gap: 10, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' },
  featureChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,193,7,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,193,7,0.15)' },
  featureText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, left: -width * 0.2, width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, backgroundColor: 'rgba(255,193,7,0.06)' },
  orb2: { position: 'absolute', bottom: height * 0.05, right: -width * 0.3, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(99,102,241,0.05)' },
  orb3: { position: 'absolute', top: height * 0.4, left: width * 0.1, width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15, backgroundColor: 'rgba(255,193,7,0.04)' },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});

const field = StyleSheet.create({
  wrap: { height: 56, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  iconWrap: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
});
