import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';
import { UserContext } from '../contexts/app-context';
import { getBaseUrl } from '../lib/chat-api';
import { useNavigation } from '@react-navigation/native';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    messageId?: string;
    [key: string]: any;
  };
}

const NotificationContext = createContext<{
  showNotification: (notif: AppNotification) => void;
}>({ showNotification: () => {} });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const user = useContext(UserContext);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [activeNotif, setActiveNotif] = useState<AppNotification | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setActiveNotif(null));
  };

  const showNotification = (notif: AppNotification) => {
    // Trigger quick vibration safely
    try {
      Vibration.vibrate([0, 150]);
    } catch (e) {
      // Ignore if device doesn't support vibration or permission error
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveNotif(notif);

    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    // Auto hide after 4 seconds
    timerRef.current = setTimeout(() => {
      hideNotification();
    }, 4000);
  };

  // ─── Global Socket.io listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let activeSocket: Socket | null = null;
    let isMounted = true;

    (async () => {
      try {
        const baseUrl = await getBaseUrl();
        const userJson = await AsyncStorage.getItem('@user');
        const userData = userJson ? JSON.parse(userJson) : null;

        if (!baseUrl || !userData?.token || !isMounted) return;

        console.log('🔌 Connecting global notification socket to:', baseUrl);

        activeSocket = io(baseUrl, {
          transports: ['websocket', 'polling'],
          auth: { token: userData.token },
          query: { token: userData.token },
          extraHeaders: {
            Authorization: `Bearer ${userData.token}`,
          },
          reconnection: true,
          reconnectionAttempts: 10,
        });

        activeSocket.on('connect', () => {
          console.log('✅ Global notification socket connected:', activeSocket?.id);
        });

        activeSocket.on('connect_error', (err) => {
          console.error('❌ Notification socket error:', err?.message);
        });

        activeSocket.on('notification:new', (notif: AppNotification) => {
          console.log('🔔 Notification received:', notif.title);
          showNotification(notif);
        });
      } catch (e) {
        console.error('Global socket connection error:', e);
      }
    })();

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [user]);

  const handlePress = () => {
    if (!activeNotif) return;
    const conversationId = activeNotif.data?.conversationId;
    hideNotification();

    if (conversationId && navigation?.navigate) {
      try {
        navigation.navigate('Chat', {
          screen: 'Conversation',
          params: { conversation: { id: conversationId } },
        });
      } catch (e) {
        console.log('Navigation to conversation error:', e);
      }
    }
  };

  const colors = {
    bg: isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f9fafb' : '#111827',
    muted: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#5dd4bf' : '#00a991',
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {activeNotif && (
        <Animated.View
          style={[
            styles.banner,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              top: insets.top + 8,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePress}
            style={styles.touchable}
          >
            <View style={[styles.iconBg, { backgroundColor: isDark ? '#115e59' : '#ccfbf1' }]}>
              <MessageSquare size={18} color={colors.accent} />
            </View>

            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {activeNotif.title}
              </Text>
              <Text style={[styles.body, { color: colors.muted }]} numberOfLines={2}>
                {activeNotif.body}
              </Text>
            </View>

            <TouchableOpacity onPress={hideNotification} style={styles.closeBtn}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function useInAppNotification() {
  return useContext(NotificationContext);
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
