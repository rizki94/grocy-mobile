import React, { useContext } from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { POSScreen } from '../screens/main/pos-screen';
import { AttendanceScreen } from '../screens/main/attendance-screen';
import { SettingsScreen } from '../screens/main/settings-screen';
import { ShoppingCart, Clock, Settings } from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserContext } from '../contexts/app-context';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useContext(UserContext);

  const initialRoute = user?.isPinSession ? 'POS' : 'AttendanceTab';

  return (
    <Tab.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0f1115' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#262a32' : '#e2e8f0',
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="AttendanceTab"
        component={AttendanceScreen}
        options={{
          tabBarLabel: t('navigate.attendance') || 'Absensi',
          tabBarIcon: ({ color, size, focused }) => (
            <Clock
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarLabel: t('navigate.pos') || 'Kasir',
          tabBarIcon: ({ color, size, focused }) => (
            <ShoppingCart
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('navigate.settings') || 'Pengaturan',
          tabBarIcon: ({ color, size, focused }) => (
            <Settings
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
