import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState, useCallback } from 'react';
import { Platform, ToastAndroid } from 'react-native';

const DEFAULT_URL = 'http://[IP_ADDRESS]';
const DEFAULT_DATABASE = 'grocy_app';

export const apiClient = axios.create({
  withCredentials: true,
  timeout: 15000,
});

apiClient.interceptors.request.use(
  async config => {
    const userJson = await AsyncStorage.getItem('@user');
    const user = userJson ? JSON.parse(userJson) : null;

    const localUrl = await AsyncStorage.getItem('@url');
    config.baseURL = localUrl || DEFAULT_URL;

    const database = (await AsyncStorage.getItem('@database')) || DEFAULT_DATABASE;
    config.headers['x-database-name'] = database;

    if (user?.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response Interceptor for auto-session expiration and user-friendly error messages
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      // Don't auto-clear session on login / verify-pin endpoints
      if (!requestUrl.includes('login') && !requestUrl.includes('verify-pin')) {
        console.warn('[API] Sesi kedaluwarsa (401), membersihkan sesi lokal...');
        await AsyncStorage.removeItem('@user');
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            'Sesi Anda telah berakhir. Silakan login kembali.',
            ToastAndroid.LONG,
          );
        }
      }
    }
    return Promise.reject(error);
  },
);

export function useConnection() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [database, setDatabase] = useState(DEFAULT_DATABASE);

  const fetchConfig = useCallback(async () => {
    try {
      const localUrl = await AsyncStorage.getItem('@url');
      if (localUrl) {
        setUrl(localUrl);
      }
      const localDb = await AsyncStorage.getItem('@database');
      if (localDb) {
        setDatabase(localDb);
      }
    } catch (e) {
      console.error('Failed to fetch connection settings', e);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateUrl = async (newUrl: string) => {
    const trimmed = newUrl.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('@url', trimmed);
    setUrl(trimmed);
  };

  const updateDatabase = async (newDb: string) => {
    const cleanDb = newDb.trim().toLowerCase();
    await AsyncStorage.setItem('@database', cleanDb);
    setDatabase(cleanDb);
  };

  return {
    url,
    setUrl: updateUrl,
    database,
    setDatabase: updateDatabase,
    defaultUrl: DEFAULT_URL,
    defaultDatabase: DEFAULT_DATABASE,
    apiClient,
    refreshConfig: fetchConfig,
  };
}

export default useConnection;
