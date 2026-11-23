import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card, CardContent } from '../../components/ui/card';
import { useThemeColor } from '../../lib/colors';
import { apiClient } from '../../hooks/use-connection';
import { UserContext } from '../../contexts/app-context';
import {
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Store,
  DollarSign,
  Package,
  Receipt,
  RefreshCw,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react-native';
import moment from 'moment';

interface ChannelStat {
  total: number;
  count: number;
}

interface DashboardStats {
  sales?: {
    today: number;
    thisMonth: number;
    thisYear: number;
    todayCount: number;
    monthCount: number;
    yearCount: number;
  };
  channels?: {
    pos: ChannelStat;
    marketplace: ChannelStat;
    directSales: ChannelStat;
  };
  topSellingProducts?: Array<{
    productId: string | number;
    name: string;
    totalQty: number;
    totalRevenue: number;
  }>;
  recentTransactions?: Array<{
    id?: string | number;
    invoice: string;
    totalAmount: number;
    type: string;
    customerName?: string;
    createdAt: string;
  }>;
}

export function AdminSalesReportScreen({ navigation }: any) {
  const colors = useThemeColor();
  const user = useContext(UserContext);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (val: number = 0) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get('/api/dashboard/stats');
      setStats(res.data);
    } catch (err: any) {
      console.error('[DashboardStats] Fetch error:', err);
      setError(
        err.response?.data?.message ||
          'Gagal memuat ringkasan penjualan. Pastikan server terhubung.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Channel Calculations
  const posTotal = stats?.channels?.pos?.total || 0;
  const posCount = stats?.channels?.pos?.count || 0;

  const marketplaceTotal = stats?.channels?.marketplace?.total || 0;
  const marketplaceCount = stats?.channels?.marketplace?.count || 0;

  const directSalesTotal = stats?.channels?.directSales?.total || 0;
  const directSalesCount = stats?.channels?.directSales?.count || 0;

  const grandTotalChannels = posTotal + marketplaceTotal + directSalesTotal;

  const posPct = grandTotalChannels > 0 ? (posTotal / grandTotalChannels) * 100 : 0;
  const mpPct = grandTotalChannels > 0 ? (marketplaceTotal / grandTotalChannels) * 100 : 0;
  const directPct = grandTotalChannels > 0 ? (directSalesTotal / grandTotalChannels) * 100 : 0;

  return (
    <AppLayout title="Laporan Penjualan" showBack={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* Welcome & Time Banner */}
        <View className="mb-4 pt-1">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-foreground">
                Ringkasan Sales
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {moment().format('dddd, DD MMMM YYYY')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => fetchStats(true)}
              className="p-2.5 rounded-full bg-secondary/50 active:bg-secondary"
            >
              <RefreshCw size={15} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center gap-3">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-xs text-muted-foreground font-semibold">
              Memuat data penjualan multi-channel...
            </Text>
          </View>
        ) : error ? (
          <View className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 items-center gap-3 my-4">
            <Text className="text-destructive text-xs font-bold text-center">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => fetchStats(false)}
              className="px-4 py-2 rounded-xl bg-destructive"
            >
              <Text className="text-white text-xs font-bold">Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-5">
            {/* Primary KPI Cards: Hari Ini & Bulan Ini */}
            <View className="flex-row gap-3">
              {/* Card 1: Hari Ini */}
              <View className="flex-1 p-4 rounded-3xl bg-primary/10 border border-primary/25">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    Hari Ini
                  </Text>
                  <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center">
                    <DollarSign size={14} color={colors.primary} />
                  </View>
                </View>
                <Text className="text-lg font-black text-foreground">
                  {formatCurrency(stats?.sales?.today)}
                </Text>
                <Text className="text-[11px] text-muted-foreground mt-1">
                  {stats?.sales?.todayCount || 0} transaksi
                </Text>
              </View>

              {/* Card 2: Bulan Ini */}
              <View className="flex-1 p-4 rounded-3xl bg-secondary/30 border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Bulan Ini
                  </Text>
                  <View className="w-7 h-7 rounded-full bg-secondary items-center justify-center">
                    <TrendingUp size={14} color={colors.mutedForeground} />
                  </View>
                </View>
                <Text className="text-lg font-black text-foreground">
                  {formatCurrency(stats?.sales?.thisMonth)}
                </Text>
                <Text className="text-[11px] text-muted-foreground mt-1">
                  {stats?.sales?.monthCount || 0} transaksi
                </Text>
              </View>
            </View>

            {/* CHANNEL BREAKDOWN SECTION */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <Layers size={16} color={colors.primary} />
                  <Text className="text-sm font-black text-foreground">
                    Penjualan Per Saluran
                  </Text>
                </View>
                <Text className="text-[11px] font-bold text-muted-foreground">
                  Total: {formatCurrency(grandTotalChannels)}
                </Text>
              </View>

              {/* Multi-segment Proportion Bar */}
              {grandTotalChannels > 0 && (
                <View className="h-2.5 w-full bg-secondary/60 rounded-full flex-row overflow-hidden mb-3.5">
                  <View
                    style={{ width: `${Math.max(posPct, 3)}%` }}
                    className="h-full bg-emerald-500"
                  />
                  <View
                    style={{ width: `${Math.max(mpPct, 3)}%` }}
                    className="h-full bg-amber-500"
                  />
                  <View
                    style={{ width: `${Math.max(directPct, 3)}%` }}
                    className="h-full bg-blue-500"
                  />
                </View>
              )}

              {/* 3 Channel Cards */}
              <View className="gap-2.5">
                {/* 1. POS Kasir (Toko Offline) */}
                <View className="p-4 rounded-2xl bg-card border border-border flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center">
                      <Store size={22} color="#10b981" />
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-foreground">
                          POS Kasir Toko
                        </Text>
                        <View className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                          <Text className="text-[9px] font-bold text-emerald-500">
                            {posPct.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {posCount} transaksi struk
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(posTotal)}
                  </Text>
                </View>

                {/* 2. Marketplace Online */}
                <View className="p-4 rounded-2xl bg-card border border-border flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 items-center justify-center">
                      <ShoppingBag size={22} color="#f59e0b" />
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-foreground">
                          Marketplace Online
                        </Text>
                        <View className="px-1.5 py-0.5 rounded bg-amber-500/20">
                          <Text className="text-[9px] font-bold text-amber-500">
                            {mpPct.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {marketplaceCount} pesanan Shopee/Tokopedia
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatCurrency(marketplaceTotal)}
                  </Text>
                </View>

                {/* 3. Direct Sales / B2B */}
                <View className="p-4 rounded-2xl bg-card border border-border flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 items-center justify-center">
                      <Truck size={22} color="#3b82f6" />
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-foreground">
                          Direct Sales / B2B
                        </Text>
                        <View className="px-1.5 py-0.5 rounded bg-blue-500/20">
                          <Text className="text-[9px] font-bold text-blue-500">
                            {directPct.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {directSalesCount} faktur penjualan langsung
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                    {formatCurrency(directSalesTotal)}
                  </Text>
                </View>
              </View>
            </View>

            {/* TOP SELLING PRODUCTS */}
            {stats?.topSellingProducts && stats.topSellingProducts.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-3">
                  <Package size={16} color={colors.primary} />
                  <Text className="text-sm font-black text-foreground">
                    Top 5 Produk Terlaris
                  </Text>
                </View>
                <View className="rounded-2xl bg-card border border-border overflow-hidden">
                  {stats.topSellingProducts.map((p, idx) => (
                    <View
                      key={p.productId || idx}
                      className={`p-3.5 flex-row items-center justify-between ${
                        idx !== (stats.topSellingProducts?.length || 0) - 1
                          ? 'border-b border-border/60'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1 mr-2">
                        <View className="w-6 h-6 rounded-full bg-secondary items-center justify-center">
                          <Text className="text-[11px] font-black text-muted-foreground">
                            {idx + 1}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-xs font-bold text-foreground"
                            numberOfLines={1}
                          >
                            {p.name}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground mt-0.5">
                            Terjual {p.totalQty} unit
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-foreground font-mono">
                        {formatCurrency(p.totalRevenue)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* RECENT TRANSACTIONS */}
            {stats?.recentTransactions && stats.recentTransactions.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-3">
                  <Receipt size={16} color={colors.primary} />
                  <Text className="text-sm font-black text-foreground">
                    Transaksi Penjualan Terbaru
                  </Text>
                </View>
                <View className="rounded-2xl bg-card border border-border overflow-hidden">
                  {stats.recentTransactions.slice(0, 5).map((t, idx) => {
                    const isPos = t.type === 'pos_sales';
                    const isMarketplace = !!(t as any).marketplaceId;
                    const channelLabel = isMarketplace
                      ? 'Marketplace'
                      : isPos
                      ? 'POS'
                      : 'Direct';
                    const badgeColor = isMarketplace
                      ? 'bg-amber-500/15 text-amber-500'
                      : isPos
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-blue-500/15 text-blue-500';

                    return (
                      <View
                        key={t.id || t.invoice || idx}
                        className={`p-3.5 flex-row items-center justify-between ${
                          idx !== Math.min(stats.recentTransactions?.length || 0, 5) - 1
                            ? 'border-b border-border/60'
                            : ''
                        }`}
                      >
                        <View className="flex-1 mr-2">
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-xs font-black text-foreground font-mono">
                              {t.invoice}
                            </Text>
                            <View className={`px-1.5 py-0.5 rounded ${badgeColor}`}>
                              <Text className={`text-[9px] font-bold ${badgeColor.split(' ')[1]}`}>
                                {channelLabel}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[10px] text-muted-foreground mt-0.5">
                            {t.customerName ? `${t.customerName} • ` : ''}
                            {moment(t.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </View>
                        <Text className="text-xs font-black text-foreground font-mono">
                          {formatCurrency(t.totalAmount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quick Access to POS */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('POS')}
              className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex-row items-center justify-between active:bg-emerald-500/25"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
                  <ShoppingCart size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">
                    Buka Kasir POS
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Mulai transaksi penjualan toko langsung
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}
