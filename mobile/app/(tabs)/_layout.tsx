import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './sensor';

const BACKEND_URL = 'http://10.192.24.96:3000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function TabLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        saveTokenToBackend(token);
      }
    });
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
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ token }),
        });
        console.log('Push token backend\'e kaydedildi.');
      }
    } catch (e) {
      console.error('Push token kaydedilirken hata:', e);
    }
  }

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Bildirim izni alınamadı!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      console.log('Expo Push Token:', token);
    } else {
      console.log('Fiziksel cihaz gerekli.');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
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
