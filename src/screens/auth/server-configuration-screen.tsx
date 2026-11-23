import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
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
  const [fetchingDbs, setFetchingDbs] = useState(false);
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);
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

  const handleFetchDatabases = async () => {
    const targetUrl = value.trim().replace(/\/+$/, '');
    if (!targetUrl || targetUrl.includes('[IP_ADDRESS]')) {
      Alert.alert('Perhatian', 'Silakan masukkan URL Server yang valid terlebih dahulu.');
      return;
    }

    try {
      setFetchingDbs(true);
      const res = await axios.get(`${targetUrl}/api/tenant/databases`, { timeout: 8000 });
      if (res.data && Array.isArray(res.data.databases)) {
        setAvailableDbs(res.data.databases);
        if (res.data.databases.length > 0 && !res.data.databases.includes(dbValue)) {
          setDbValue(res.data.defaultDatabase || res.data.databases[0]);
        }
        Alert.alert('Sukses', `Ditemukan ${res.data.databases.length} database di server.`);
      } else {
        Alert.alert('Info', 'Server terhubung tetapi tidak mengembalikan daftar database.');
      }
    } catch (e: any) {
      console.error('Failed to fetch databases:', e);
      Alert.alert('Koneksi Gagal', e.message || 'Tidak dapat menghubungi server.');
    } finally {
      setFetchingDbs(false);
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
    <AppLayout title={t('serverConfig.title')} showBack>
      <ScrollView className="p-4 flex-1" keyboardShouldPersistTaps="handled">
        {/* Server URL Section */}
        <View className="mb-5">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Globe size={16} color={colors.primary} />
            <Text className="text-foreground font-semibold text-sm">
              {t('serverConfig.serverUrl')}
            </Text>
          </View>
          <Input
            value={value}
            onChangeText={setValue}
            placeholder="http://192.168.1.100:3001"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="text-[11px] text-muted-foreground mt-1">
            Alamat IP atau domain backend Grocy Server.
          </Text>
        </View>

        {/* Database / Tenant Section */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Database size={16} color={colors.primary} />
              <Text className="text-foreground font-semibold text-sm">
                Nama Database / Workspace
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleFetchDatabases}
              disabled={fetchingDbs}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10"
            >
              {fetchingDbs ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={12} color={colors.primary} />
              )}
              <Text className="text-[11px] font-bold text-primary">Cek Server</Text>
            </TouchableOpacity>
          </View>

          <Input
            value={dbValue}
            onChangeText={text => setDbValue(text.toLowerCase())}
            placeholder="grocy_app"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="text-[11px] text-muted-foreground mt-1">
            Database tenant perusahaan aktif (default: {defaultDatabase}).
          </Text>

          {/* Available Databases List */}
          {availableDbs.length > 0 && (
            <View className="mt-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
              <Text className="text-[11px] font-bold text-foreground mb-2">
                Pilih Database Tersedia:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {availableDbs.map(dbName => {
                  const isSelected = dbValue === dbName;
                  return (
                    <TouchableOpacity
                      key={dbName}
                      onPress={() => setDbValue(dbName)}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg border ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'bg-card border-border'
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={12} color="#ffffff" />}
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-foreground'
                        }`}
                      >
                        {dbName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="gap-3 mt-4">
          <Button
            label={t('serverConfig.defaultUrl')}
            variant="secondary"
            onPress={() => {
              setValue(defaultUrl);
              setDbValue(defaultDatabase);
            }}
          />
          <Button
            label={loading ? t('serverConfig.saving') : t('element.save')}
            onPress={handleSave}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </AppLayout>
  );
}
