import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, ToastAndroid, Platform } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useConnection } from '../../hooks/use-connection';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';
import { Database, Globe, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';

export function ServerConfigurationScreen() {
  const navigation = useNavigation<any>();
  const { url, setUrl, defaultUrl, database, setDatabase, defaultDatabase } = useConnection();
  const [value, setValue] = useState('');
  const [dbValue, setDbValue] = useState(defaultDatabase);
  const [loading, setLoading] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const { t } = useTranslation();
  const colors = useThemeColor();

  useEffect(() => {
    if (url) {
      setValue(url);
    }
  }, [url]);

  useEffect(() => {
    if (database) {
      setDbValue(database);
    }
  }, [database]);

  const handleCheckServer = async () => {
    const targetUrl = value.trim().replace(/\/+$/, '');
    if (!targetUrl || targetUrl.includes('[IP_ADDRESS]')) {
      Alert.alert('Perhatian', 'Silakan masukkan URL Server yang valid terlebih dahulu.');
      return;
    }

    try {
      setCheckingServer(true);
      setServerOnline(null);

      // Ping /healthz to validate server availability without exposing tenant DBs
      const res = await axios.get(`${targetUrl}/healthz`, { timeout: 6000 });
      if (res.status === 200) {
        setServerOnline(true);
        if (Platform.OS === 'android') {
          ToastAndroid.show('✅ Server terhubung & online!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Sukses', 'Server terhubung & online.');
        }
      } else {
        setServerOnline(false);
        Alert.alert('Info', `Server merespons status ${res.status}`);
      }
    } catch (e: any) {
      console.error('Server check failed:', e);
      setServerOnline(false);
      Alert.alert('Koneksi Gagal', 'Server tidak dapat dijangkau. Periksa alamat URL dan koneksi jaringan.');
    } finally {
      setCheckingServer(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await setUrl(value);
      await setDatabase(dbValue || defaultDatabase);
      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title={t('serverConfig.title') || 'Konfigurasi Server'} showBack>
      <ScrollView className="p-4 flex-1" keyboardShouldPersistTaps="handled">
        {/* Server URL Section */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Globe size={16} color={colors.primary} />
              <Text className="text-foreground font-semibold text-sm">
                {t('serverConfig.serverUrl') || 'URL Server'}
              </Text>
            </View>

            {/* Check Server Button */}
            <TouchableOpacity
              onPress={handleCheckServer}
              disabled={checkingServer}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 active:bg-primary/20"
            >
              {checkingServer ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={12} color={colors.primary} />
              )}
              <Text className="text-xs font-bold text-primary">Cek Server</Text>
            </TouchableOpacity>
          </View>

          <Input
            value={value}
            onChangeText={text => {
              setValue(text);
              setServerOnline(null);
            }}
            placeholder="http://192.168.1.100:3001"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {serverOnline !== null && (
            <View className={`flex-row items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg ${
              serverOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20'
            }`}>
              {serverOnline ? (
                <>
                  <CheckCircle2 size={13} color="#10b981" />
                  <Text className="text-xs font-bold text-emerald-500">Server Terhubung & Siap Digunakan</Text>
                </>
              ) : (
                <Text className="text-xs font-bold text-destructive">Server Tidak Merespons</Text>
              )}
            </View>
          )}

          <Text className="text-[11px] text-muted-foreground mt-1.5">
            Alamat IP atau domain backend Grocy Server.
          </Text>
        </View>

        {/* Database / Tenant Section */}
        <View className="mb-5">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Database size={16} color={colors.primary} />
            <Text className="text-foreground font-semibold text-sm">
              Nama Database / Workspace
            </Text>
          </View>

          <Input
            value={dbValue}
            onChangeText={text => setDbValue(text.toLowerCase().trim())}
            placeholder="grocy_app"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="text-[11px] text-muted-foreground mt-1.5">
            Nama database tenant perusahaan (default: {defaultDatabase}).
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="gap-3 mt-4">
          <Button
            label={t('serverConfig.defaultUrl') || 'Reset Default'}
            variant="secondary"
            onPress={() => {
              setValue(defaultUrl);
              setDbValue(defaultDatabase);
              setServerOnline(null);
            }}
          />
          <Button
            label={loading ? (t('serverConfig.saving') || 'Menyimpan...') : (t('element.save') || 'Simpan')}
            onPress={handleSave}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </AppLayout>
  );
}
