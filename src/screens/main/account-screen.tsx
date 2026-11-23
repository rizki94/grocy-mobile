import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { UserContext, AuthContext, ConnectionContext } from '../../contexts/app-context';
import { useConnection } from '../../hooks/use-connection';
import { useTranslation } from 'react-i18next';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Building2,
  Database,
  CheckCircle2,
} from 'lucide-react-native';
import { useThemeColor } from '../../lib/colors';

export function AccountScreen() {
  const { t } = useTranslation();
  const user = useContext(UserContext);
  const connection = useContext(ConnectionContext);
  const colors = useThemeColor();
  const { apiClient } = useConnection();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const displayName = user?.displayName || user?.name || user?.username || 'User';
  const username = user?.username || user?.name || '-';
  const roleName = user?.role_name || user?.role || 'Staff';
  const branchName = user?.branchName || user?.branchCode || 'Pusat';
  const activeDatabase = connection?.database || 'grocy_app';

  const handleChangePassword = async () => {
    if (!currentPassword) {
      notify('Masukkan kata sandi saat ini.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      notify('Kata sandi baru minimal 6 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Konfirmasi kata sandi baru tidak cocok.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.put(`/api/users/${user?.id}/change-password`, {
        currentPassword,
        newPassword,
      });

      if (res.status === 200) {
        notify('Kata sandi berhasil diperbarui!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        notify(res.data?.message || 'Gagal mengubah kata sandi', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal mengubah kata sandi';
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert(type === 'success' ? 'Sukses' : 'Perhatian', msg);
    }
  };

  return (
    <AppLayout title={t('settings.account.myAccount') || 'Akun Saya'} showBack>
      <ScrollView
        className="flex-1 px-4 py-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View className="bg-card border border-border/60 rounded-3xl p-5 mb-5 shadow-sm">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center">
              <UserIcon size={32} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-foreground tracking-tight">
                {displayName}
              </Text>
              <Text className="text-xs font-semibold text-muted-foreground mt-0.5">
                @{username}
              </Text>
              <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                <View className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex-row items-center gap-1">
                  <Shield size={10} color="#10b981" />
                  <Text className="text-[10px] font-bold text-emerald-500 uppercase">
                    {roleName}
                  </Text>
                </View>
                <View className="px-2.5 py-0.5 rounded-full bg-secondary/50 border border-border flex-row items-center gap-1">
                  <Building2 size={10} color={colors.mutedForeground} />
                  <Text className="text-[10px] font-bold text-muted-foreground">
                    {branchName}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Database Info Bar */}
          <View className="mt-4 pt-3 border-t border-border/40 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Database size={13} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground font-medium">Tenant Database</Text>
            </View>
            <Text className="text-xs font-mono font-bold text-emerald-500">{activeDatabase}</Text>
          </View>
        </View>

        {/* Change Password Card */}
        <View className="bg-card border border-border/60 rounded-3xl p-5 mb-8 shadow-sm">
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center">
              <Lock size={16} color="#10b981" />
            </View>
            <View>
              <Text className="text-sm font-black text-foreground">
                Ubah Kata Sandi
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                Pastikan menggunakan kata sandi yang kuat dan aman
              </Text>
            </View>
          </View>

          {/* Current Password Input */}
          <View className="mb-3.5">
            <Text className="text-xs font-bold text-foreground mb-1.5">
              Kata Sandi Saat Ini
            </Text>
            <View className="flex-row items-center bg-secondary/30 border border-border rounded-xl px-3.5">
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder="Masukkan kata sandi lama"
                placeholderTextColor="#6b7280"
                className="flex-1 py-3 text-sm text-foreground"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-1">
                {showCurrent ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password Input */}
          <View className="mb-3.5">
            <Text className="text-xs font-bold text-foreground mb-1.5">
              Kata Sandi Baru (Min. 6 Karakter)
            </Text>
            <View className="flex-row items-center bg-secondary/30 border border-border rounded-xl px-3.5">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="Masukkan kata sandi baru"
                placeholderTextColor="#6b7280"
                className="flex-1 py-3 text-sm text-foreground"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-1">
                {showNew ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-foreground mb-1.5">
              Konfirmasi Kata Sandi Baru
            </Text>
            <View className="flex-row items-center bg-secondary/30 border border-border rounded-xl px-3.5">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="Ketik ulang kata sandi baru"
                placeholderTextColor="#6b7280"
                className="flex-1 py-3 text-sm text-foreground"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                {showConfirm ? (
                  <EyeOff size={18} color="#9ca3af" />
                ) : (
                  <Eye size={18} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 active:bg-emerald-700 items-center justify-center flex-row gap-2"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <CheckCircle2 size={16} color="#ffffff" />
                <Text className="text-sm font-bold text-white">
                  Simpan Kata Sandi
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppLayout>
  );
}
