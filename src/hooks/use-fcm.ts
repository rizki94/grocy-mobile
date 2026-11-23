import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
  requestPermission,
  AuthorizationStatus,
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

/**
 * Request notification permission from the OS.
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'Grocy Mobile needs notification access to send important updates.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  // iOS
  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Get the FCM token
 */
async function registerToken() {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);
    console.log('[FCM] Got token:', token ? token.substring(0, 20) + '...' : 'null');
  } catch (e: any) {
    console.error('[FCM] registerToken failed:', e?.message || e);
  }
}

/**
 * Main FCM hook
 */
export function useFcm(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeTokenRefresh: (() => void) | undefined;

    async function setup() {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      await registerToken();

      const messaging = getMessaging();

      // Re-register whenever token rotates
      unsubscribeTokenRefresh = onTokenRefresh(messaging, async _newToken => {});

      // Foreground messages
      unsubscribeForeground = onMessage(messaging, async msg => {
        console.log('[FCM] Foreground message received:', JSON.stringify(msg?.notification));
      });
    }

    setup();

    return () => {
      unsubscribeForeground?.();
      unsubscribeTokenRefresh?.();
    };
  }, [isAuthenticated]);
}

/**
 * Background / killed-state FCM handler.
 * MUST be called at module level in index.js.
 */
export function setupBackgroundFcmHandler() {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async _remoteMessage => {
    // OS automatically handles displaying standard notifications
  });
}
