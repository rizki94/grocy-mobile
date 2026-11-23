import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Vibration,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/safe-area-view';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import {
  Settings,
  Eye,
  EyeOff,
  Database,
  ShoppingCart,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react-native';
import { AuthContext, ConnectionContext } from '../../contexts/app-context';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';
import Logo from '../../assets/text-logo.svg';

export function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { login, loginWithPin } = useContext(AuthContext);
  const connection = useContext(ConnectionContext);

  // Admin form state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  // POS PIN Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const activeDatabase = connection?.database || 'grocy_app';

  // Handle Admin / Manager Login (Username & Password)
  const handleAdminLogin = async () => {
    if (!name || !password) {
      setAdminError(t('login.fillAllFields') || 'Harap isi semua kolom');
      return;
    }
    setAdminError('');
    setAdminLoading(true);
    try {
      await login(name, password);
    } catch (e: any) {
      setAdminError(e.message || t('login.invalidCredentials') || 'Username atau password salah');
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Kasir PIN Verification
  const handleVerifyPosPin = async (inputPin?: string) => {
    const pinToVerify = (inputPin || pin).trim();
    if (pinToVerify.length < 4) return;

    try {
      setVerifyingPin(true);
      setPinError('');
      await loginWithPin(pinToVerify);
      setShowPinModal(false);
      setPin('');
    } catch (e: any) {
      setPinError(e.message || 'PIN kasir tidak valid');
      setPin('');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleKeyPress = (num: string) => {
    try {
      Vibration.vibrate(20);
    } catch (_) {}

    if (pin.length < 4 && !verifyingPin) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handleVerifyPosPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    try {
      Vibration.vibrate(20);
    } catch (_) {}
    if (!verifyingPin) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleResetPin = () => {
    try {
      Vibration.vibrate(20);
    } catch (_) {}
    setPin('');
    setPinError('');
  };

  return (
    <SafeAreaView containerClasses="justify-center">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        {/* Header Logo & Tenant Badge */}
        <View className="items-center mb-6">
          <View className="mb-3">
            <Logo width={130} height={130} />
          </View>

          {/* Multi-tenant Database Badge */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ServerConfiguration')}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 active:bg-primary/20"
          >
            <Database size={13} color={colors.primary} />
            <Text className="text-xs font-bold text-primary font-mono">
              {activeDatabase}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Operational Mode Cards */}
        <View className="gap-3.5 mb-6">
          <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-center mb-1">
            PILIH MODE OPERASIONAL
          </Text>

          {/* 1. Kasir POS (Mode PIN) */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              setPin('');
              setPinError('');
              setShowPinModal(true);
            }}
            className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center gap-4 active:bg-emerald-500/20 shadow-sm"
          >
            <View className="w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShoppingCart size={28} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-lg font-black text-foreground">
                  Kasir POS
                </Text>
                <View className="px-2 py-0.5 rounded-md bg-emerald-500/20">
                  <Text className="text-[10px] font-black text-emerald-500 uppercase">
                    PIN MODE
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Buka sesi kasir & transaksi langsung via PIN 4 digit
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2. Absensi Karyawan */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate('AttendanceKiosk')}
            className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex-row items-center gap-4 active:bg-blue-500/20 shadow-sm"
          >
            <View className="w-14 h-14 rounded-2xl bg-blue-500 items-center justify-center shadow-lg shadow-blue-500/30">
              <Clock size={28} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-lg font-black text-foreground">
                  Absensi Karyawan
                </Text>
                <View className="px-2 py-0.5 rounded-md bg-blue-500/20">
                  <Text className="text-[10px] font-black text-blue-500 uppercase">
                    MANDIRI
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Clock-In & Clock-Out via PIN, swafoto & lokasi GPS
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Mode Admin / Manajer (Collapsible) */}
        <View className="border-t border-border/60 pt-4">
          <TouchableOpacity
            onPress={() => setShowAdminLogin(prev => !prev)}
            className="flex-row items-center justify-between py-2 px-3 rounded-xl bg-secondary/30 active:bg-secondary/50 mb-3"
          >
            <View className="flex-row items-center gap-2">
              <Lock size={15} color={colors.mutedForeground} />
              <Text className="text-xs font-bold text-muted-foreground">
                Mode Admin / Manajer (Laporan & Setting)
              </Text>
            </View>
            {showAdminLogin ? (
              <ChevronUp size={16} color={colors.mutedForeground} />
            ) : (
              <ChevronDown size={16} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>

          {showAdminLogin && (
            <Card className="border border-border/80 bg-card rounded-2xl p-4 mb-3">
              <CardContent className="gap-3 px-0 py-0">
                {adminError ? (
                  <View className="bg-destructive/10 p-3 rounded-xl mb-1 flex-row items-center gap-2">
                    <ShieldAlert size={16} color={colors.destructive} />
                    <Text className="text-destructive text-xs font-bold flex-1">
                      {adminError}
                    </Text>
                  </View>
                ) : null}

                <Input
                  label={t('login.username') || 'Username'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="none"
                />

                <Input
                  label={t('login.password') || 'Password'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  rightIcon={
                    showPassword ? (
                      <Eye
                        size={20}
                        color={colors.mutedForeground}
                        onPress={() => setShowPassword(false)}
                      />
                    ) : (
                      <EyeOff
                        size={20}
                        color={colors.mutedForeground}
                        onPress={() => setShowPassword(true)}
                      />
                    )
                  }
                />

                <Button
                  className="mt-2"
                  label={adminLoading ? t('login.loggingIn') || 'Memproses...' : t('login.loginToAccount') || 'Masuk Sistem'}
                  onPress={handleAdminLogin}
                  disabled={adminLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Server Configuration Button */}
          <Button
            variant="outline"
            className="flex-row gap-2"
            onPress={() => navigation.navigate('ServerConfiguration')}
          >
            <Settings size={16} color={colors.foreground} />
            <Text className="text-foreground font-medium text-xs">
              {t('login.serverConfig') || 'Konfigurasi Server'}
            </Text>
          </Button>
        </View>

        <View className="mt-8">
          <Text className="text-center text-[10px] text-muted-foreground opacity-60">
            &copy; 2026 Grocy Mobile. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* POS PIN Numpad Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!verifyingPin) setShowPinModal(false);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/80 p-5">
          <View className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl">
            {/* Modal Header */}
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center mb-3">
                <ShoppingCart size={28} color="#10b981" />
              </View>
              <Text className="text-lg font-black text-foreground">
                PIN Kasir POS
              </Text>
              <Text className="text-xs text-muted-foreground mt-1 text-center">
                Masukkan 4 digit PIN karyawan untuk memulai sesi kasir
              </Text>
            </View>

            {/* Error Message */}
            {pinError ? (
              <View className="bg-destructive/15 border border-destructive/30 p-2.5 rounded-xl mb-4 items-center">
                <Text className="text-destructive text-xs font-bold text-center">
                  {pinError}
                </Text>
              </View>
            ) : null}

            {/* 4-Digit Dots Indicator */}
            <View className="flex-row justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map(index => {
                const isFilled = pin.length > index;
                return (
                  <View
                    key={index}
                    className={`w-5 h-5 rounded-full border-2 ${
                      isFilled
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-secondary/40 border-border'
                    }`}
                  />
                );
              })}
            </View>

            {/* Verifying Loader */}
            {verifyingPin && (
              <View className="flex-row items-center justify-center mb-4 gap-2">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-xs text-emerald-500 font-bold">
                  Memverifikasi PIN Kasir...
                </Text>
              </View>
            )}

            {/* Numpad 4x3 */}
            <View className="gap-2.5 mb-5">
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['C', '0', '⌫'],
              ].map((row, rIdx) => (
                <View key={rIdx} className="flex-row justify-between gap-2.5">
                  {row.map(item => {
                    if (item === 'C') {
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={handleResetPin}
                          disabled={verifyingPin}
                          className="flex-1 h-14 rounded-2xl bg-secondary/30 border border-border/80 items-center justify-center active:bg-secondary/60"
                        >
                          <Text className="text-xs font-bold text-destructive">
                            RESET
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    if (item === '⌫') {
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={handleDelete}
                          disabled={verifyingPin}
                          className="flex-1 h-14 rounded-2xl bg-secondary/30 border border-border/80 items-center justify-center active:bg-secondary/60"
                        >
                          <RotateCcw size={18} color={colors.foreground} />
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={() => handleKeyPress(item)}
                        disabled={verifyingPin}
                        className="flex-1 h-14 rounded-2xl bg-card border border-border items-center justify-center active:bg-emerald-500/20 shadow-sm"
                      >
                        <Text className="text-xl font-black text-foreground">
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowPinModal(false)}
              disabled={verifyingPin}
              className="py-2.5 rounded-xl bg-secondary/30 items-center"
            >
              <Text className="text-xs font-bold text-muted-foreground">
                Batal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
