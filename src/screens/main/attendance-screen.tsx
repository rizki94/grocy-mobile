import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  TextInput,
  Vibration,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useThemeColor } from '../../lib/colors';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  KeyRound,
  ArrowRight,
  LogOut,
  LogIn,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import { useConnection } from '../../hooks/use-connection';
import { UserContext } from '../../contexts/app-context';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

export function AttendanceScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { apiClient, database } = useConnection();
  const user = useContext(UserContext);
  const isPersonalMode = !!user;

  const [pin, setPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selfie, setSelfie] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        return (
          granted['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.CAMERA'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = (): Promise<any> => {
    setLocationLoading(true);
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          setLocationLoading(false);
          setLocation(position.coords);
          resolve(position.coords);
        },
        error => {
          setLocationLoading(false);
          console.warn('Geolocation error:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    });
  };

  // Load status for personal mode (already logged in)
  const fetchMyStatus = useCallback(async () => {
    if (!isPersonalMode) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/api/hrd/attendances/my-today');
      if (res.data) {
        setEmployee(res.data.employee);
        setShift(res.data.shift);
        setTodayAttendance(res.data.attendance);
        getCurrentLocation().catch(() => {});
      }
    } catch (e: any) {
      console.warn('Fetch my attendance status error:', e.response?.data?.message || e.message);
      if (e.response?.status === 404) {
        Alert.alert(
          'Profil Belum Terhubung',
          e.response?.data?.message || 'Akun ini belum dihubungkan ke data karyawan di menu Master Karyawan.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [apiClient, isPersonalMode]);

  useEffect(() => {
    if (isPersonalMode) {
      fetchMyStatus();
    }
  }, [isPersonalMode, fetchMyStatus]);

  // Kiosk PIN verification
  const handleVerifyPin = async (inputPin?: string) => {
    const pinToVerify = (inputPin || pin).trim();
    if (!pinToVerify) {
      Alert.alert('Perhatian', 'Masukkan PIN absensi karyawan terlebih dahulu.');
      return;
    }

    try {
      setVerifyingPin(true);
      const res = await apiClient.post('/api/hrd/attendances/verify-pin', {
        pin: pinToVerify,
      });

      if (res.data && res.data.status === 200) {
        setEmployee(res.data.employee);
        setShift(res.data.shift);
        setTodayAttendance(res.data.todayAttendance);
        getCurrentLocation().catch(() => {});
      } else {
        Alert.alert('Gagal', res.data?.message || 'PIN absensi tidak valid.');
      }
    } catch (e: any) {
      console.error('Verify PIN error:', e);
      Alert.alert(
        'Gagal Verifikasi',
        e.response?.data?.message || 'Terjadi kesalahan koneksi saat verifikasi PIN.',
      );
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleKeyPress = (num: string) => {
    try {
      Vibration.vibrate(20);
    } catch (_) {}
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        handleVerifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    try {
      Vibration.vibrate(20);
    } catch (_) {}
    setPin(prev => prev.slice(0, -1));
  };

  const handleTakeSelfie = async () => {
    const hasPerm = await requestPermissions();
    if (!hasPerm) {
      Alert.alert('Izin Dibutuhkan', 'Izin kamera dan lokasi dibutuhkan untuk absensi.');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.5,
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error Kamera', response.errorMessage || 'Gagal membuka kamera');
          return;
        }
        if (response.assets && response.assets[0]) {
          setSelfie(response.assets[0]);
        }
      },
    );
  };

  const handleSubmitAttendance = async (type: 'clock-in' | 'clock-out') => {
    if (!employee) {
      Alert.alert('Perhatian', 'Identitas karyawan belum terverifikasi.');
      return;
    }

    let currentCoords = location;
    if (!currentCoords) {
      try {
        currentCoords = await getCurrentLocation();
      } catch (e) {
        console.warn('Location retry failed');
      }
    }

    try {
      setLoading(true);

      const photoBase64 = selfie?.base64
        ? `data:${selfie.type || 'image/jpeg'};base64,${selfie.base64}`
        : null;

      const payload = {
        pin: isPersonalMode ? undefined : pin,
        type,
        photo: photoBase64,
        latitude: currentCoords?.latitude || null,
        longitude: currentCoords?.longitude || null,
        location: currentCoords
          ? `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`
          : null,
        notes: notes.trim() || undefined,
      };

      const endpoint = isPersonalMode
        ? '/api/hrd/attendances/my-clock-in'
        : '/api/hrd/attendances/mobile-clock-in';

      const res = await apiClient.post(endpoint, payload);

      if (res.data && res.data.status === 200) {
        const msg = res.data.message || 'Absensi berhasil dicatat!';
        setSuccessMessage(msg);

        if (isPersonalMode) {
          setTodayAttendance(res.data.attendance);
          setSelfie(null);
          setNotes('');
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          // Kiosk mode: Reset back to PIN screen for next employee after 2.5 seconds
          setTimeout(() => {
            setSuccessMessage(null);
            setEmployee(null);
            setShift(null);
            setTodayAttendance(null);
            setPin('');
            setSelfie(null);
            setNotes('');
          }, 2500);
        }
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mencatat absensi.');
      }
    } catch (e: any) {
      console.error('Attendance submit error:', e);
      Alert.alert(
        'Gagal Absensi',
        e.response?.data?.message || 'Terjadi kesalahan saat menyimpan absensi.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetKiosk = () => {
    setEmployee(null);
    setShift(null);
    setTodayAttendance(null);
    setPin('');
    setSelfie(null);
    setNotes('');
  };

  // Determine current attendance state
  const isClockedIn = !!todayAttendance?.clockIn;
  const isClockedOut = !!todayAttendance?.clockOut;

  // View: Kiosk PIN Entry
  if (!isPersonalMode && !employee) {
    return (
      <View className="flex-1 bg-background justify-between py-8 px-6">
        {/* Top Header */}
        <View className="items-center mt-4">
          <View className="flex-row items-center justify-between w-full mb-4">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 rounded-xl bg-card border border-border"
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Text className="text-xs font-bold text-primary font-mono">{database}</Text>
            </View>
          </View>

          <View className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
            <KeyRound size={32} color={colors.primary} />
          </View>
          <Text className="text-xl font-black text-foreground">Absensi Karyawan</Text>
          <Text className="text-xs text-muted-foreground mt-1 text-center">
            Mode Kiosk / Tablet Toko & Gudang. Masukkan 4 digit PIN Anda.
          </Text>

          {/* PIN Dots */}
          <View className="flex-row gap-4 mt-6">
            {[0, 1, 2, 3].map(index => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  className={`w-5 h-5 rounded-full border-2 ${
                    isFilled
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  }`}
                />
              );
            })}
          </View>
        </View>

        {/* Numpad */}
        <View className="w-full max-w-xs self-center mb-6">
          {verifyingPin && (
            <View className="flex-row items-center justify-center mb-4 gap-2">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-xs text-primary font-bold">Memverifikasi PIN...</Text>
            </View>
          )}

          <View className="gap-3">
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['C', '0', '⌫'],
            ].map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row justify-between gap-3">
                {row.map(item => {
                  if (item === 'C') {
                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setPin('')}
                        disabled={verifyingPin}
                        className="flex-1 h-16 rounded-2xl bg-card border border-border items-center justify-center active:bg-secondary/40"
                      >
                        <Text className="text-sm font-bold text-destructive">RESET</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (item === '⌫') {
                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={handleDelete}
                        disabled={verifyingPin}
                        className="flex-1 h-16 rounded-2xl bg-card border border-border items-center justify-center active:bg-secondary/40"
                      >
                        <RotateCcw size={20} color={colors.foreground} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => handleKeyPress(item)}
                      disabled={verifyingPin}
                      className="flex-1 h-16 rounded-2xl bg-card border border-border items-center justify-center active:bg-primary/20"
                    >
                      <Text className="text-2xl font-black text-foreground">{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Auth')}
          className="self-center py-2 px-4"
        >
          <Text className="text-xs text-muted-foreground text-center">
            Punya akun sistem? <Text className="text-primary font-bold">Masuk di sini</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // View: Loading state for Personal Mode
  if (isPersonalMode && loading && !employee) {
    return (
      <AppLayout title="Absensi Mandiri" showBack={false}>
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-xs text-muted-foreground mt-3 font-semibold">
            Memuat profil absensi Anda...
          </Text>
        </View>
      </AppLayout>
    );
  }

  // View: Failed state for Personal Mode
  if (isPersonalMode && !loading && !employee) {
    return (
      <AppLayout title="Absensi Mandiri" showBack={false}>
        <View className="flex-1 items-center justify-center p-6">
          <AlertCircle size={40} color={colors.destructive} />
          <Text className="text-base font-bold text-foreground mt-3 text-center">
            Gagal Memuat Profil Karyawan
          </Text>
          <Text className="text-xs text-muted-foreground mt-1 text-center leading-relaxed">
            Tidak dapat menemukan atau menghubungkan profil karyawan aktif untuk akun ini.
          </Text>
          <TouchableOpacity
            onPress={fetchMyStatus}
            className="mt-4 px-5 py-2.5 rounded-xl bg-primary active:opacity-80"
          >
            <Text className="text-xs font-bold text-primary-foreground">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  // View: Attendance Card & Action (both Personal Mode and Verified Kiosk Mode)
  return (
    <AppLayout title={isPersonalMode ? "Absensi Mandiri" : "Konfirmasi Absensi"} showBack={!isPersonalMode}>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {successMessage && (
          <View className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center gap-3">
            <CheckCircle2 size={24} color="#10b981" />
            <Text className="flex-1 text-sm font-bold text-emerald-500">
              {successMessage}
            </Text>
          </View>
        )}

        {/* Employee Profile Card */}
        {employee ? (
          <Card className="p-4 mb-4 bg-card border border-border rounded-2xl">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                  <User size={24} color={colors.primary} />
                </View>
                <View>
                  <Text className="text-base font-black text-foreground">
                    {employee.fullName}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    NIK: {employee.nik} • {employee.department}
                  </Text>
                </View>
              </View>

              {!isPersonalMode && (
                <TouchableOpacity
                  onPress={handleResetKiosk}
                  className="p-2 rounded-xl bg-secondary/30"
                >
                  <RotateCcw size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Shift & Today Status */}
            <View className="pt-3 border-t border-border flex-row justify-between items-center">
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color={colors.primary} />
                <Text className="text-xs font-semibold text-foreground">
                  {shift ? `${shift.name} (${shift.startTime} - ${shift.endTime})` : 'Shift Standar'}
                </Text>
              </View>

              <View
                className={`px-2.5 py-1 rounded-full ${
                  isClockedOut
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : isClockedIn
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}
              >
                <Text
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    isClockedOut
                      ? 'text-blue-500'
                      : isClockedIn
                      ? 'text-emerald-500'
                      : 'text-amber-500'
                  }`}
                >
                  {isClockedOut
                    ? 'Sudah Pulang'
                    : isClockedIn
                    ? 'Sudah Masuk'
                    : 'Belum Masuk'}
                </Text>
              </View>
            </View>

            {/* Timestamps */}
            {isClockedIn && (
              <View className="mt-3 pt-2 border-t border-border/50 flex-row justify-between">
                <Text className="text-xs text-muted-foreground">
                  Masuk:{' '}
                  <Text className="font-bold text-foreground">
                    {moment(todayAttendance.clockIn).format('HH:mm:ss')}
                  </Text>
                  {todayAttendance.lateMinutes > 0 && (
                    <Text className="text-amber-500"> (+{todayAttendance.lateMinutes}m)</Text>
                  )}
                </Text>
                {isClockedOut && (
                  <Text className="text-xs text-muted-foreground">
                    Pulang:{' '}
                    <Text className="font-bold text-foreground">
                      {moment(todayAttendance.clockOut).format('HH:mm:ss')}
                    </Text>
                  </Text>
                )}
              </View>
            )}
          </Card>
        ) : loading ? (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-xs text-muted-foreground mt-2">Memuat profil karyawan...</Text>
          </View>
        ) : null}

        {/* Location & GPS Info */}
        <Card className="p-4 mb-4 bg-card border border-border rounded-2xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <MapPin size={18} color={colors.primary} />
              <Text className="text-sm font-bold text-foreground">Lokasi GPS</Text>
            </View>
            <TouchableOpacity
              onPress={() => getCurrentLocation()}
              disabled={locationLoading}
              className="p-1.5 rounded-lg bg-secondary/30"
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RotateCcw size={14} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          </View>

          {location ? (
            <Text className="text-xs font-mono text-muted-foreground">
              Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
            </Text>
          ) : (
            <Text className="text-xs text-amber-500">
              {locationLoading ? 'Mendeteksi titik koordinat GPS...' : 'Lokasi GPS belum terdeteksi. Ketuk refresh.'}
            </Text>
          )}
        </Card>

        {/* Selfie Photo Preview / Trigger */}
        <Card className="p-4 mb-4 bg-card border border-border rounded-2xl items-center">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 self-start">
            Foto Selfie Karyawan
          </Text>

          {selfie ? (
            <View className="relative items-center">
              <Image
                source={{ uri: selfie.uri }}
                className="w-48 h-48 rounded-2xl border-2 border-primary"
              />
              <TouchableOpacity
                onPress={handleTakeSelfie}
                className="mt-3 px-4 py-1.5 rounded-full bg-secondary/40 border border-border"
              >
                <Text className="text-xs font-bold text-foreground">Ambil Ulang Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleTakeSelfie}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-border bg-secondary/10 items-center justify-center active:bg-secondary/20"
            >
              <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-2">
                <Camera size={28} color={colors.primary} />
              </View>
              <Text className="text-xs font-bold text-foreground">Buka Kamera Depan</Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">
                Ambil selfie untuk validasi kehadiran
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Optional Notes */}
        <Card className="p-4 mb-6 bg-card border border-border rounded-2xl">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Catatan Tambahan (Opsional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Keterangan dinas luar, lembur, dsb..."
            placeholderTextColor={colors.mutedForeground}
            className="p-3 rounded-xl bg-background border border-border text-foreground text-sm"
          />
        </Card>

        {/* Action Buttons */}
        <View className="gap-3 mb-8">
          {!isClockedIn ? (
            <Button
              label={loading ? 'Menyimpan...' : '🕒 Masuk Kerja (Clock In)'}
              onPress={() => handleSubmitAttendance('clock-in')}
              disabled={loading || !employee}
              className="bg-emerald-600 active:bg-emerald-700 py-4"
            />
          ) : !isClockedOut ? (
            <Button
              label={loading ? 'Menyimpan...' : '🏠 Pulang Kerja (Clock Out)'}
              onPress={() => handleSubmitAttendance('clock-out')}
              disabled={loading || !employee}
              className="bg-blue-600 active:bg-blue-700 py-4"
            />
          ) : (
            <View className="p-4 rounded-2xl bg-secondary/30 items-center">
              <CheckCircle2 size={28} color="#10b981" />
              <Text className="text-sm font-bold text-foreground mt-1">
                Absensi Hari Ini Selesai
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Anda sudah menyelesaikan absensi masuk dan pulang.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
}
