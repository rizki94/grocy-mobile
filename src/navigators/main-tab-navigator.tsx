import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FinanceScreen } from '../screens/main/finance-screen';
import { HomeScreen } from '../screens/main/home-screen';
import { WarehouseScreen } from '../screens/main/warehouse-screen';
import { SettingsScreen } from '../screens/main/settings-screen';
import { SalesScreen } from '../screens/main/sales-screen';
import {
  Home,
  Warehouse as WarehouseIcon,
  Settings,
  DollarSign,
  Wallet,
} from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { usePermissions } from '../hooks/use-permissions';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const { hasPermission } = usePermissions();

  // Permissions mapped directly to grocy-client (web version) and grocy-server database codes
  const salesPermissions = [
    'transaction.sales.view',
    'contact.customer.view',
    'crm.view',
    'settings.payment_method.view',
    // Legacy fallbacks
    'approve-invoice',
    'loss-profit-report',
    'sales-return-list',
    'sales-omzet-report',
    'sales-order',
    'price-request-approve',
  ];

  const financePermissions = [
    'accounting.payment.view',
    'accounting.journal.view',
    'accounting.gl.view',
    'report.profit_loss.view',
    'report.balance_sheet.view',
    'report.customer_outstanding.view',
    'transaction.purchase.view',
    // Legacy fallbacks
    'payment-ar-list',
    'payment-ap-list',
    'purchase-report',
    '4pilar-pelunasan-piutang',
    '4pilar-pelunasan-hutang',
  ];

  const warehousePermissions = [
    'product.view',
    'settings.warehouse.view',
    'transaction.stock_opname.view',
    'transaction.adjustment.view',
    'transaction.transfer_stock.view',
    // Legacy fallbacks
    'stock-opname-list',
    'product-stock-list',
  ];
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0f1115' : '#f8fafc',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#262a32' : '#e2e8f0',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarLabel: t('navigate.home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      {hasPermission(salesPermissions) && (
        <Tab.Screen
          name="Sales"
          component={SalesScreen}
          options={{
            tabBarLabel: t('sales.title'),
            tabBarIcon: ({ color, size }) => (
              <DollarSign size={size} color={color} />
            ),
          }}
        />
      )}

      {hasPermission(financePermissions) && (
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            tabBarLabel: t('finance.title'),
            tabBarIcon: ({ color, size }) => (
              <Wallet size={size} color={color} />
            ),
          }}
        />
      )}

      {hasPermission(warehousePermissions) && (
        <Tab.Screen
          name="Warehouse"
          component={WarehouseScreen}
          options={{
            tabBarLabel: t('warehouse.title'),
            tabBarIcon: ({ color, size }) => (
              <WarehouseIcon size={size} color={color} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
