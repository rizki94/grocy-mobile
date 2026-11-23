import { useAppTheme } from '../hooks/use-app-theme';

// Theme colors that match global.css
export const colors = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    primary: '#059669',
    primaryForeground: '#ffffff',
    secondary: '#f1f5f9',
    foreground: '#111827',
    mutedForeground: '#4b5563',
    destructive: '#dc2626',
    border: '#e2e8f0',
    // Accent colors
    amber: '#d97706',
    blue: '#2563eb',
    indigo: '#4f46e5',
    orange: '#ea580c',
    green: '#16a34a',
    red: '#dc2626',
  },
  dark: {
    background: '#0f1115',
    card: '#181b1f',
    primary: '#10b981',
    primaryForeground: '#ffffff',
    secondary: '#20242a',
    foreground: '#e5e7eb',
    mutedForeground: '#9ca3af',
    destructive: '#ef4444',
    border: '#262a32',
    // Accent colors
    amber: '#f59e0b',
    blue: '#3b82f6',
    indigo: '#6366f1',
    orange: '#f97316',
    green: '#10b981',
    red: '#ef4444',
  },
};

export function useThemeColor() {
  const { isDark } = useAppTheme();

  return {
    background: isDark ? colors.dark.background : colors.light.background,
    card: isDark ? colors.dark.card : colors.light.card,
    primary: isDark ? colors.dark.primary : colors.light.primary,
    primaryForeground: isDark
      ? colors.dark.primaryForeground
      : colors.light.primaryForeground,
    secondary: isDark ? colors.dark.secondary : colors.light.secondary,
    foreground: isDark ? colors.dark.foreground : colors.light.foreground,
    mutedForeground: isDark
      ? colors.dark.mutedForeground
      : colors.light.mutedForeground,
    destructive: isDark ? colors.dark.destructive : colors.light.destructive,
    border: isDark ? colors.dark.border : colors.light.border,
    amber: isDark ? colors.dark.amber : colors.light.amber,
    blue: isDark ? colors.dark.blue : colors.light.blue,
    indigo: isDark ? colors.dark.indigo : colors.light.indigo,
    orange: isDark ? colors.dark.orange : colors.light.orange,
    green: isDark ? colors.dark.green : colors.light.green,
    red: isDark ? colors.dark.red : colors.light.red,
  };
}
