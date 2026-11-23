import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdminSalesReportScreen } from '../screens/main/admin-sales-report-screen';
import { AttendanceScreen } from '../screens/main/attendance-screen';
import { SettingsScreen } from '../screens/main/settings-screen';
import { Settings, TrendingUp, Clock } from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="SalesReportTab"
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
        name="SalesReportTab"
        component={AdminSalesReportScreen}
        options={{
          tabBarLabel: 'Penjualan',
          tabBarIcon: ({ color, size, focused }) => (
            <TrendingUp
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      <Tab.Screen
        name="AttendanceTab"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Absensi',
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
