import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';
import {
  User as UserIcon,
  LogOut,
  Moon,
  Globe,
  ChevronRight,
  Check,
  RefreshCw,
  Server,
  Shield,
  Building2,
  Database,
  Smartphone,
} from 'lucide-react-native';

import { AuthContext, UserContext, ConnectionContext } from '../../contexts/app-context';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useThemeColor } from '../../lib/colors';
import { useAutoUpdate } from '../../hooks/use-auto-update';
import Logo from '../../assets/logo.svg';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useContext(AuthContext);
  const user = useContext(UserContext);
  const connection = useContext(ConnectionContext);
  const { colorScheme, setColorScheme } = useAppTheme();
  const { i18n, t } = useTranslation();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { checkForUpdates, isChecking } = useAutoUpdate();

  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('system');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user-theme-preference').then(val => {
      if (val) setThemePreference(val as any);
    });
  }, []);

  const currentLanguage = i18n.language || 'id';
  const languageLabel = currentLanguage === 'id' ? 'Bahasa Indonesia' : 'English';

  const themeLabel =
    themePreference === 'dark'
      ? t('settings.selectTheme.dark') || 'Gelap'
      : themePreference === 'light'
      ? t('settings.selectTheme.light') || 'Terang'
      : t('settings.selectTheme.systemDefault') || 'Sistem Default';

  const themes = [
    { label: t('settings.selectTheme.light') || 'Terang', value: 'light' },
    { label: t('settings.selectTheme.dark') || 'Gelap', value: 'dark' },
    { label: t('settings.selectTheme.systemDefault') || 'Sistem Default', value: 'system' },
  ];

  const languages = [
    { label: 'Bahasa Indonesia', value: 'id' },
    { label: 'English', value: 'en' },
  ];

  const displayName = user?.displayName || user?.name || user?.username || 'Staff User';
  const username = user?.username || user?.name || '-';
  const roleName = user?.role_name || user?.role || 'Staff';
  const branchName = user?.branchName || user?.branchCode || 'Pusat';
  const activeDatabase = connection?.database || 'grocy_app';
  const serverUrl = connection?.url || 'http://localhost:3001';

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {/* Header */}
      <View className="px-5 py-4 border-b border-border/40 bg-card">
        <Text className="text-xl font-black text-foreground tracking-tight">
          {t('settings.title') || 'Pengaturan'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* User Profile Card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AccountDetail')}
          className="bg-card border border-border/60 rounded-3xl p-5 mb-5 active:opacity-90 shadow-sm"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center">
              <UserIcon size={28} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-foreground">
                {displayName}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                @{username}
              </Text>
              <View className="flex-row items-center gap-2 mt-2">
                <View className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex-row items-center gap-1">
                  <Shield size={9} color="#10b981" />
                  <Text className="text-[10px] font-bold text-emerald-500 uppercase">
                    {roleName}
                  </Text>
                </View>
                <View className="px-2 py-0.5 rounded-full bg-secondary/50 border border-border flex-row items-center gap-1">
                  <Building2 size={9} color={colors.mutedForeground} />
                  <Text className="text-[10px] font-bold text-muted-foreground">
                    {branchName}
                  </Text>
                </View>
              </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-secondary/40 items-center justify-center">
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Section: Preferensi */}
        <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-2">
          Preferensi Tampilan
        </Text>
        <View className="bg-card border border-border/60 rounded-3xl mb-5 overflow-hidden shadow-sm">
          {/* Theme */}
          <TouchableOpacity
            onPress={() => setShowThemeModal(true)}
            className="flex-row items-center justify-between p-4 border-b border-border/30 active:bg-secondary/20"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-blue-500/15 items-center justify-center">
                <Moon size={18} color="#3b82f6" />
              </View>
              <Text className="text-sm font-bold text-foreground">Tema Aplikasi</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-muted-foreground font-medium">{themeLabel}</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          {/* Language */}
          <TouchableOpacity
            onPress={() => setShowLangModal(true)}
            className="flex-row items-center justify-between p-4 active:bg-secondary/20"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-purple-500/15 items-center justify-center">
                <Globe size={18} color="#a855f7" />
              </View>
              <Text className="text-sm font-bold text-foreground">Bahasa</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-muted-foreground font-medium">{languageLabel}</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Sistem & Koneksi */}
        <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-2">
          Sistem & Koneksi
        </Text>
        <View className="bg-card border border-border/60 rounded-3xl mb-5 overflow-hidden shadow-sm">
          {/* Updates */}
          <TouchableOpacity
            onPress={() => checkForUpdates(true)}
            disabled={isChecking}
            className="flex-row items-center justify-between p-4 border-b border-border/30 active:bg-secondary/20"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-emerald-500/15 items-center justify-center">
                <RefreshCw size={18} color="#10b981" />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">Pembaruan Aplikasi</Text>
                <Text className="text-[10px] text-muted-foreground">
                  Versi saat ini v{DeviceInfo.getVersion()}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {isChecking ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs text-emerald-500 font-bold">Periksa</Text>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Server & Tenant Config */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ServerConfiguration')}
            className="flex-row items-center justify-between p-4 active:bg-secondary/20"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-amber-500/15 items-center justify-center">
                <Server size={18} color="#f59e0b" />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">Server & Database Tenant</Text>
                <Text className="text-[10px] text-muted-foreground font-mono" numberOfLines={1}>
                  {activeDatabase} • {serverUrl}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Section: Sesi & Logout */}
        <View className="bg-card border border-border/60 rounded-3xl mb-6 overflow-hidden shadow-sm">
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-between p-4 active:bg-rose-500/10"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-rose-500/15 items-center justify-center">
                <LogOut size={18} color="#ef4444" />
              </View>
              <Text className="text-sm font-bold text-rose-500">Keluar dari Akun</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Brand Footer */}
        <View className="items-center mt-2 mb-6">
          <Logo width={36} height={36} opacity={0.3} />
          <Text className="text-[11px] font-bold text-muted-foreground mt-2 opacity-60">
            Grocy Mobile v{DeviceInfo.getVersion()}
          </Text>
          <Text className="text-[10px] text-muted-foreground opacity-40 mt-0.5">
            Point of Sale & Attendance Engine
          </Text>
        </View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center px-6"
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View className="bg-card rounded-3xl overflow-hidden border border-border shadow-2xl">
            <View className="p-5 border-b border-border/40">
              <Text className="text-base font-black text-foreground">Pilih Tema Aplikasi</Text>
            </View>
            {themes.map(theme => (
              <TouchableOpacity
                key={theme.value}
                className="p-4 border-b border-border/20 flex-row items-center justify-between active:bg-secondary/20"
                onPress={async () => {
                  const val = theme.value as 'light' | 'dark' | 'system';
                  setThemePreference(val);
                  setColorScheme(val);
                  await AsyncStorage.setItem('user-theme-preference', val);
                  setShowThemeModal(false);
                }}
              >
                <Text className="text-sm text-foreground font-bold">{theme.label}</Text>
                {themePreference === theme.value && (
                  <Check size={18} color="#10b981" strokeWidth={3} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center px-6"
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View className="bg-card rounded-3xl overflow-hidden border border-border shadow-2xl">
            <View className="p-5 border-b border-border/40">
              <Text className="text-base font-black text-foreground">Pilih Bahasa</Text>
            </View>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.value}
                className="p-4 border-b border-border/20 flex-row items-center justify-between active:bg-secondary/20"
                onPress={() => {
                  i18n.changeLanguage(lang.value);
                  setShowLangModal(false);
                }}
              >
                <Text className="text-sm text-foreground font-bold">{lang.label}</Text>
                {currentLanguage === lang.value && (
                  <Check size={18} color="#10b981" strokeWidth={3} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
