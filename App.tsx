import './global.css';
import './src/lib/i18n';
import React, { useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { useAppTheme } from './src/hooks/use-app-theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AuthContext,
  ConnectionContext,
  UserContext,
} from './src/contexts/app-context';
import useAuth from './src/hooks/use-auth';
import useConnection from './src/hooks/use-connection';
import { useAutoUpdate } from './src/hooks/use-auto-update';
import { UpdateModal } from './src/components/update-modal';

import { LoginScreen } from './src/screens/auth/login-screen';
import { SplashScreen } from './src/screens/splash-screen';
import { MainTabNavigator } from './src/navigators/main-tab-navigator';
import { AccountScreen } from './src/screens/main/account-screen';
import { AttendanceScreen } from './src/screens/main/attendance-screen';
import { POSScreen } from './src/screens/main/pos-screen';
import { ServerConfigurationScreen } from './src/screens/auth/server-configuration-screen';
import { useFcm } from './src/hooks/use-fcm';
import { navigationRef } from './src/lib/navigation';

const Stack = createNativeStackNavigator();

export default function App() {
  const { auth, state } = useAuth();
  const connection = useConnection();
  const { colorScheme, setColorScheme, isDark, systemScheme } = useAppTheme();
  const [isThemeReady, setIsThemeReady] = React.useState(false);
  useAutoUpdate();

  // Register FCM token and notification permission after login
  useFcm(!!state.user);

  // Handle initial theme load and system theme changes manually
  useEffect(() => {
    const initTheme = async () => {
      const pref = await AsyncStorage.getItem('user-theme-preference');
      const targetTheme = pref || 'system';

      if (targetTheme === 'system') {
        setColorScheme(systemScheme === 'dark' ? 'dark' : 'light');
      } else {
        setColorScheme(targetTheme as any);
      }
      setIsThemeReady(true);
    };

    initTheme();
  }, [systemScheme]);

  if (!isThemeReady) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className={isDark ? 'dark' : ''} style={{ flex: 1 }}>
          <ConnectionContext.Provider value={connection}>
            <AuthContext.Provider value={auth}>
              <UserContext.Provider value={state.user}>
                <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme} ref={navigationRef}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {state.loading ? (
                      <Stack.Screen name="Splash" component={SplashScreen} />
                    ) : state.user ? (
                      state.user.role === 'cashier' || state.user.isPinSession ? (
                        <>
                          <Stack.Screen name="POS" component={POSScreen} />
                          <Stack.Screen
                            name="ServerConfiguration"
                            component={ServerConfigurationScreen}
                          />
                        </>
                      ) : (
                        <>
                          <Stack.Screen name="Main" component={MainTabNavigator} />
                          <Stack.Screen
                            name="AccountDetail"
                            component={AccountScreen}
                          />
                          <Stack.Screen
                            name="ServerConfiguration"
                            component={ServerConfigurationScreen}
                          />
                        </>
                      )
                    ) : (
                      <>
                        <Stack.Screen name="Auth" component={LoginScreen} />
                        <Stack.Screen
                          name="ServerConfiguration"
                          component={ServerConfigurationScreen}
                        />
                        <Stack.Screen
                          name="AttendanceKiosk"
                          component={AttendanceScreen}
                        />
                      </>
                    )}
                  </Stack.Navigator>
                </NavigationContainer>
              </UserContext.Provider>
            </AuthContext.Provider>
          </ConnectionContext.Provider>
          <UpdateModal />
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
