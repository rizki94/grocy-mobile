import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  ScrollView,
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
  RotateCcw,
  ShieldAlert,
  ArrowRight,
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

  // Tab selector: 'admin' (default / tab 1), 'pos' (tab 2), 'attendance' (tab 3)
  const [activeTab, setActiveTab] = useState<'admin' | 'pos' | 'attendance'>('admin');

  // Admin form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  // POS PIN state
  const [pin, setPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const activeDatabase = connection?.database || 'grocy_app';

  // Handle Admin Login (Username & Password)
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}
      >
        {/* Header Logo & Tenant Badge */}
        <View className="items-center mb-5">
          <View className="mb-2">
            <Logo width={120} height={120} />
          </View>

          {/* Multi-tenant Database Badge */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ServerConfiguration')}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25"
          >
            <Database size={13} color={colors.primary} />
            <Text className="text-xs font-bold text-primary font-mono">
              {activeDatabase}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3 Main Segmented Tabs (Login Admin is Tab 1) */}
        <View className="flex-row p-1 bg-secondary/50 rounded-2xl mb-5 border border-border/60">
          {/* Tab 1: Login Admin */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setActiveTab('admin');
              setPinError('');
            }}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-card shadow-sm border border-border/80'
                : 'opacity-70'
            }`}
          >
            <Lock
              size={14}
              color={activeTab === 'admin' ? colors.primary : colors.mutedForeground}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'admin' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Login Admin
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Kasir POS */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setActiveTab('pos');
              setAdminError('');
            }}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeTab === 'pos'
                ? 'bg-card shadow-sm border border-border/80'
                : 'opacity-70'
            }`}
          >
            <ShoppingCart
              size={14}
              color={activeTab === 'pos' ? '#10b981' : colors.mutedForeground}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'pos' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Kasir POS
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Absensi */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setActiveTab('attendance');
              setAdminError('');
              setPinError('');
            }}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-card shadow-sm border border-border/80'
                : 'opacity-70'
            }`}
          >
            <Clock
              size={14}
              color={activeTab === 'attendance' ? '#3b82f6' : colors.mutedForeground}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'attendance' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Absensi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1 Content: Login Admin (Username & Password) */}
        {activeTab === 'admin' && (
          <Card className="border border-border/80 bg-card rounded-3xl p-5 mb-5 shadow-sm">
            <CardContent className="gap-3.5 px-0 py-0">
              <View className="mb-1">
                <Text className="text-base font-black text-foreground">
                  Login Admin
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Gunakan username dan password administrator
                </Text>
              </View>

              {adminError ? (
                <View className="bg-destructive/10 p-3 rounded-xl flex-row items-center gap-2">
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
                label={
                  adminLoading
                    ? t('login.loggingIn') || 'Memproses...'
                    : 'Masuk Admin'
                }
                onPress={handleAdminLogin}
                disabled={adminLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Tab 2 Content: Kasir POS (Fast 4-Digit PIN Entry) */}
        {activeTab === 'pos' && (
          <Card className="border border-border/80 bg-card rounded-3xl p-5 mb-5 shadow-sm items-center">
            <View className="items-center mb-4">
              <View className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center mb-2">
                <ShoppingCart size={24} color="#10b981" />
              </View>
              <Text className="text-base font-black text-foreground">
                PIN Kasir POS
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5 text-center">
                Masukkan 4 digit PIN karyawan untuk memulai transaksi kasir
              </Text>
            </View>

            {/* Error Message */}
            {pinError ? (
              <View className="w-full bg-destructive/15 border border-destructive/30 p-2.5 rounded-xl mb-3 items-center">
                <Text className="text-destructive text-xs font-bold text-center">
                  {pinError}
                </Text>
              </View>
            ) : null}

            {/* 4-Digit Dots Indicator */}
            <View className="flex-row justify-center gap-4 mb-4">
              {[0, 1, 2, 3].map(index => {
                const isFilled = pin.length > index;
                return (
                  <View
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 ${
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
              <View className="flex-row items-center justify-center mb-3 gap-2">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-xs text-emerald-500 font-bold">
                  Memverifikasi PIN Kasir...
                </Text>
              </View>
            )}

            {/* Numpad 4x3 */}
            <View className="w-full gap-2 mb-1">
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['C', '0', '⌫'],
              ].map((row, rIdx) => (
                <View key={rIdx} className="flex-row justify-between gap-2">
                  {row.map(item => {
                    if (item === 'C') {
                      return (
                        <TouchableOpacity
                          key={item}
                          activeOpacity={0.7}
                          onPress={handleResetPin}
                          disabled={verifyingPin}
                          className="flex-1 h-12 rounded-2xl bg-secondary/30 border border-border/80 items-center justify-center"
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
                          activeOpacity={0.7}
                          onPress={handleDelete}
                          disabled={verifyingPin}
                          className="flex-1 h-12 rounded-2xl bg-secondary/30 border border-border/80 items-center justify-center"
                        >
                          <RotateCcw size={18} color={colors.foreground} />
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={item}
                        activeOpacity={0.7}
                        onPress={() => handleKeyPress(item)}
                        disabled={verifyingPin}
                        className="flex-1 h-12 rounded-2xl bg-card border border-border items-center justify-center shadow-xs"
                      >
                        <Text className="text-lg font-black text-foreground">
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Tab 3 Content: Absensi Karyawan */}
        {activeTab === 'attendance' && (
          <Card className="border border-border/80 bg-card rounded-3xl p-5 mb-5 shadow-sm">
            <CardContent className="px-0 py-0 items-center text-center">
              <View className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 items-center justify-center mb-3">
                <Clock size={28} color="#3b82f6" />
              </View>

              <Text className="text-base font-black text-foreground text-center">
                Absensi Mandiri Karyawan
              </Text>
              <Text className="text-xs text-muted-foreground mt-1 text-center leading-relaxed mb-6">
                Layanan presensi mandiri staf untuk Clock-In dan Clock-Out harian menggunakan PIN karyawan, verifikasi swafoto, dan validasi lokasi GPS.
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AttendanceKiosk')}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 flex-row items-center justify-center gap-2 shadow-md shadow-blue-500/25"
              >
                <Text className="text-white text-sm font-bold">
                  Buka Layar Absensi
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </TouchableOpacity>
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

        {/* Footer */}
        <View className="mt-8">
          <Text className="text-center text-[10px] text-muted-foreground opacity-60">
            &copy; 2026 Grocy Mobile. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
