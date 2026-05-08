import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './sensor';

const BACKEND_URL = 'http://10.192.24.96:3000';

// Expo Go (SDK 53+) Android push bildirimlerini desteklemiyor.
// Tüm expo-notifications API'si sadece gerçek build'lerde yükleniyor.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Notifications modülünü yalnızca Expo Go dışında yükle
type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications') as NotificationsModule;
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function TabLayout() {
  useEffect(() => {
    if (!isExpoGo) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          saveTokenToBackend(token);
        }
      });
    }
  }, []);

  async function saveTokenToBackend(token: string) {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      const accessToken = await AsyncStorage.getItem('access_token');
      if (stored && accessToken) {
        const user = JSON.parse(stored);
        await fetch(`${BACKEND_URL}/users/${user.id}/push-token`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token }),
        });
        console.log('Push token backend\'e kaydedildi.');
      }
    } catch (e) {
      console.error('Push token kaydedilirken hata:', e);
    }
  }

  async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    if (!Notifications) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require('expo-device') as typeof import('expo-device');

    let token: string | undefined;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Bildirim izni alınamadı!');
        return undefined;
      }
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        if (!projectId) {
          console.warn('Push bildirimleri için projectId bulunamadı.');
          return undefined;
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Expo Push Token:', token);
      } catch (e) {
        console.error('Push token alınamadı:', e);
      }
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="lobbies"
        options={{
          title: 'Odalar',
          tabBarIcon: ({ color }) => <FontAwesome5 size={24} name="door-open" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sensor"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color }) => <FontAwesome5 size={24} name="compass" color={color} />,
        }}
      />
    </Tabs>
  );
}
