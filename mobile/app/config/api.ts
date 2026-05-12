import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_BACKEND_URL = 'http://10.192.24.96:3000';

const extraBackendUrl =
  Constants.expoConfig?.extra?.backendUrl ??
  Constants.manifest2?.extra?.expoClient?.extra?.backendUrl;

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  (typeof extraBackendUrl === 'string' ? extraBackendUrl : undefined) ??
  DEFAULT_BACKEND_URL;

export function apiUrl(path: string): string {
  return `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function assetUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return apiUrl(path);
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
