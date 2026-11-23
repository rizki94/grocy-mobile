import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
} from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import { useConnection } from '../../hooks/use-connection';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

export function AttendanceScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { apiClient, database } = useConnection();

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
        // Pre-fetch location
        getCurrentLocation().catch(() => {});
      } else {
        Alert.alert('Gagal', res.data?.message || 'PIN absensi tidak valid.');
      }
    } catch (e: any) {
      console.error('Verify PIN error:', e);
      Alert.alert(
        'Gagal Verifikasi',
        e.response?.data?.message || e.message || 'PIN absensi tidak ditemukan atau karyawan tidak aktif.',
      );
    } finally {
      setVerifyingPin(false);
    }
  };

  const takeSelfie = async () => {
    const hasPerm = await requestPermissions();
    if (!hasPerm) {
      Alert.alert('Izin Ditolak', 'Aplikasi memerlukan izin kamera untuk absensi selfie.');
      return;
    }

    const options: any = {
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.5,
      saveToPhotos: false,
      includeBase64: true,
    };

    const result = await launchCamera(options);
    if (result.assets && result.assets.length > 0) {
      setSelfie(result.assets[0]);
    }
  };

  const handleClockAction = async (type: 'clock-in' | 'clock-out') => {
    const hasPerm = await requestPermissions();
    if (!hasPerm) {
      Alert.alert('Izin Diperlukan', 'Izin kamera dan lokasi diperlukan untuk absensi.');
      return;
    }

    if (!selfie) {
      Alert.alert('Foto Selfie Diperlukan', 'Silakan ambil foto selfie terlebih dahulu sebelum absensi.');
      return;
    }

    try {
      setLoading(true);

      let coords = location;
      if (!coords) {
        try {
          coords = await getCurrentLocation();
        } catch (e) {
          console.warn('Using fallback location');
        }
      }

      const photoData = selfie.base64
        ? `data:${selfie.type || 'image/jpeg'};base64,${selfie.base64}`
        : selfie.uri;

      const payload = {
        pin: pin.trim(),
        type,
        photo: photoData,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        location: coords ? `${coords.latitude},${coords.longitude}` : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await apiClient.post('/api/hrd/attendances/mobile-clock-in', payload);

      if (res.data && res.data.status === 200) {
        const att = res.data.attendance;
        setTodayAttendance(att);
        setSelfie(null);
        setNotes('');

        const actionLabel = type === 'clock-in' ? 'Absensi Masuk' : 'Absensi Pulang';
        Alert.alert(
          'Sukses!',
          `${actionLabel} berhasil dicatat untuk ${employee.fullName} (${moment().format('HH:mm:ss')}).`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh attendance state
                handleVerifyPin();
              },
            },
          ],
        );
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mencatat absensi.');
      }
    } catch (e: any) {
      console.error('Attendance submission error:', e);
      Alert.alert(
        'Gagal Absensi',
        e.response?.data?.message || e.message || 'Terjadi kesalahan saat memproses absensi.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmployee(null);
    setShift(null);
    setTodayAttendance(null);
    setPin('');
    setSelfie(null);
    setNotes('');
    setLocation(null);
  };

  const isClockedIn = !!todayAttendance?.clockIn;
  const isClockedOut = !!todayAttendance?.clockOut;

  return (
    <AppLayout title="Absensi Karyawan Mobile" showBack>
      <ScrollView className="p-4 flex-1" keyboardShouldPersistTaps="handled">
        {/* Workspace info header */}
        <View className="flex-row items-center justify-between mb-4 px-1">
          <View className="flex-row items-center gap-1.5">
            <Clock size={16} color={colors.primary} />
            <Text className="text-xs text-muted-foreground font-medium">
              {moment().format('dddd, DD MMMM YYYY')}
            </Text>
          </View>
          <View className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            <Text className="text-[10px] font-mono font-bold text-primary">
              {database || 'grocy_app'}
            </Text>
          </View>
        </View>

        {/* Step 1: PIN Input & Verification */}
        {!employee ? (
          <View className="p-5 rounded-2xl bg-card border border-border shadow-sm">
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                <KeyRound size={28} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold text-foreground">
                Masukkan PIN Absensi
              </Text>
              <Text className="text-xs text-muted-foreground text-center mt-1 px-4">
                Masukkan 4–6 digit PIN absensi mobile yang terdaftar pada profil karyawan.
              </Text>
            </View>

            <View className="mb-4">
              <Input
                value={pin}
                onChangeText={text => {
                  setPin(text);
                  if (text.length >= 4) {
                    // Auto-verify when 4 digits reached
                    handleVerifyPin(text);
                  }
                }}
                placeholder="cth: 1234"
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                textAlign="center"
                className="text-2xl font-bold tracking-widest h-14"
              />
            </View>

            <Button
              label={verifyingPin ? 'Memverifikasi...' : 'Verifikasi PIN'}
              onPress={() => handleVerifyPin()}
              disabled={verifyingPin || pin.length < 3}
            />
          </View>
        ) : (
          /* Step 2: Employee Profile & Attendance Action */
          <View className="space-y-4">
            {/* Employee Card */}
            <View className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-12 h-12 rounded-full bg-primary/15 items-center justify-center">
                  <User size={24} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    {employee.fullName}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    NIK: {employee.nik} • {employee.department} ({employee.position})
                  </Text>
                  {shift && (
                    <Text className="text-[11px] text-primary font-semibold mt-0.5">
                      Shift: {shift.name} ({shift.startTime} - {shift.endTime})
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleReset}
                className="p-2 rounded-xl bg-secondary/50"
              >
                <RotateCcw size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Today's Status Banner */}
            <View className="p-3.5 rounded-xl bg-card border border-border">
              <Text className="text-xs font-bold text-foreground mb-2">
                Status Absensi Hari Ini:
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    className={`w-3 h-3 rounded-full ${
                      isClockedIn ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <Text className="text-xs font-semibold text-foreground">
                    Masuk:{' '}
                    {isClockedIn
                      ? moment(todayAttendance.clockIn).format('HH:mm:ss')
                      : 'Belum'}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <View
                    className={`w-3 h-3 rounded-full ${
                      isClockedOut ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <Text className="text-xs font-semibold text-foreground">
                    Pulang:{' '}
                    {isClockedOut
                      ? moment(todayAttendance.clockOut).format('HH:mm:ss')
                      : 'Belum'}
                  </Text>
                </View>
              </View>

              {todayAttendance?.lateMinutes > 0 && (
                <View className="mt-2 p-2 rounded-lg bg-amber-500/10 flex-row items-center gap-1.5">
                  <AlertCircle size={14} color="#f59e0b" />
                  <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Terlambat {todayAttendance.lateMinutes} menit
                  </Text>
                </View>
              )}
            </View>

            {/* Selfie Photo Section */}
            {!isClockedOut && (
              <View className="p-4 rounded-2xl bg-card border border-border space-y-3">
                <Text className="text-xs font-bold text-foreground">
                  Foto Selfie Verifikasi *
                </Text>

                {selfie ? (
                  <View className="items-center">
                    <Image
                      source={{ uri: selfie.uri }}
                      className="w-40 h-40 rounded-2xl mb-2"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={takeSelfie}
                      className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50"
                    >
                      <Camera size={14} color={colors.foreground} />
                      <Text className="text-xs font-medium text-foreground">
                        Ambil Ulang Selfie
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={takeSelfie}
                    className="h-36 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 items-center justify-center space-y-2"
                  >
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                      <Camera size={24} color={colors.primary} />
                    </View>
                    <Text className="text-xs font-bold text-primary">
                      Ketuk untuk Ambil Foto Selfie
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      Kamera depan akan otomatis dibuka
                    </Text>
                  </TouchableOpacity>
                )}

                {/* GPS Location status */}
                <View className="flex-row items-center justify-between pt-2 border-t border-border/40">
                  <View className="flex-row items-center gap-1.5">
                    <MapPin size={14} color={colors.primary} />
                    <Text className="text-[11px] text-muted-foreground font-medium">
                      {locationLoading
                        ? 'Mengambil lokasi GPS...'
                        : location
                        ? `GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                        : 'Lokasi belum terdeteksi'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => getCurrentLocation()}
                    className="p-1"
                  >
                    <RotateCcw size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Optional Notes */}
                <View className="mt-2">
                  <Text className="text-[11px] text-muted-foreground mb-1 font-medium">
                    Catatan (Opsional):
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Contoh: dinas luar, lembur shift malam..."
                    placeholderTextColor={colors.mutedForeground}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12,
                      color: colors.foreground,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Attendance Action Buttons */}
            <View className="space-y-2 pt-2">
              {!isClockedIn ? (
                <Button
                  label={loading ? 'Memproses...' : 'Absen Masuk (Clock In)'}
                  onPress={() => handleClockAction('clock-in')}
                  disabled={loading || !selfie}
                  className="bg-emerald-600"
                />
              ) : !isClockedOut ? (
                <Button
                  label={loading ? 'Memproses...' : 'Absen Pulang (Clock Out)'}
                  onPress={() => handleClockAction('clock-out')}
                  disabled={loading || !selfie}
                  className="bg-blue-600"
                />
              ) : (
                <View className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center">
                  <CheckCircle2 size={24} color="#10b981" />
                  <Text className="text-sm font-bold text-foreground mt-1">
                    Absensi Selesai!
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center mt-0.5">
                    Anda sudah melakukan absensi masuk dan pulang lengkap hari ini.
                  </Text>
                </View>
              )}

              <Button
                variant="outline"
                label="Ganti Karyawan / Absen Lainnya"
                onPress={handleReset}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}
