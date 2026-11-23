import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from '../../components/layout/safe-area-view';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
} from '../../components/ui/card';
import { Settings, Eye, EyeOff, Database } from 'lucide-react-native';
import { AuthContext, ConnectionContext } from '../../contexts/app-context';
import { useThemeColor } from '../../lib/colors';

import { useTranslation } from 'react-i18next';
import Logo from '../../assets/text-logo.svg';

export function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { login } = React.useContext(AuthContext);
  const connection = React.useContext(ConnectionContext);
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const activeDatabase = connection?.database || 'grocy_app';

  const handleLogin = async () => {
    if (!name || !password) {
      setError(t('login.fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(name, password);
    } catch (e: any) {
      setError(e.message || t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView containerClasses="justify-center">
      <View className="items-center mb-6">
        <View className="mb-4">
          <Logo width={120} height={120} />
        </View>

        {/* Multi-tenant Database Badge */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ServerConfiguration')}
          className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"
        >
          <Database size={12} color={colors.primary} />
          <Text className="text-[11px] font-bold text-primary font-mono">
            {activeDatabase}
          </Text>
        </TouchableOpacity>
      </View>

      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="gap-2 px-0 space-y-4">
          {error ? (
            <View className="bg-destructive/10 p-3 rounded-md mb-2">
              <Text className="text-destructive text-sm font-medium text-center">
                {error}
              </Text>
            </View>
          ) : null}
          <Input
            label={t('login.username')}
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
          />
          <Input
            label={t('login.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightIcon={
              <React.Fragment>
                {showPassword ? (
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
                )}
              </React.Fragment>
            }
          />
          <Button
            className="mt-4"
            label={loading ? t('login.loggingIn') : t('login.loginToAccount')}
            onPress={handleLogin}
            disabled={loading}
          />
          <Button
            variant="outline"
            className="flex-row gap-2 mt-2"
            onPress={() => navigation.navigate('ServerConfiguration')}
          >
            <Settings size={18} color={colors.foreground} />
            <Text className="text-foreground font-medium">
              {t('login.serverConfig')}
            </Text>
          </Button>
        </CardContent>
      </Card>

      <View className="mt-8">
        <Text className="text-center text-xs text-muted-foreground">
          &copy; 2026 Grocy Mobile. All rights reserved.
        </Text>
      </View>
    </SafeAreaView>
  );
}
