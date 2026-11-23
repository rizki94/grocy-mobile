import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  LayoutGrid,
  List as ListIcon,
  Barcode,
  User,
  PauseCircle,
  Receipt,
  RotateCcw,
  DoorOpen,
  DollarSign,
  ChevronDown,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loading } from '../../components/ui/loading';
import { numberWithComma } from '../../utils/helpers';
import moment from 'moment';

interface Product {
  id: string;
  Name: string;
  Category?: string;
  Stock?: number;
  barcode?: string;
  unit1?: string;
  unit2?: string;
  unit3?: string;
  unit4?: string;
  ratio1?: number;
  ratio2?: number;
  ratio3?: number;
  ratio4?: number;
  PriceA1?: number;
  PriceA2?: number;
  PriceA3?: number;
  PriceA4?: number;
  id1?: string;
  id2?: string;
  id3?: string;
  id4?: string;
  [key: string]: any;
}

interface CartItem {
  id: string; // productDetailId
  product: Product;
  qty: number;
  level: number; // 1, 2, 3, 4
  unitName: string;
  price: number;
  discount: number;
  baseRatio: number;
}

interface HeldBill {
  id: string;
  timestamp: string;
  customerName: string;
  cart: CartItem[];
  total: number;
}

const HELD_BILLS_STORAGE = '@pos_held_bills';

export function POSScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { apiClient, database } = useConnection();

  // State
  const [session, setSession] = useState<any>(null);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCashActual, setClosingCashActual] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Modals & Panels
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Customer
  const [customer, setCustomer] = useState<{ id?: string; name: string }>({
    name: 'Pelanggan Umum',
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<any[]>([]);

  // Held Bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);

  // Payment
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [paidAmount, setPaidAmount] = useState('');

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load Session & Initial Data
  const checkActiveSession = useCallback(async () => {
    try {
      setIsCheckingSession(true);
      const res = await apiClient.get('/api/pos-sessions/active');
      if (res.data && res.data.id) {
        setSession(res.data);
      } else {
        setSession(null);
      }
    } catch (e) {
      console.warn('No active POS session:', e);
      setSession(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, [apiClient]);

  const fetchProducts = useCallback(async (query = '') => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/bridge/product_stock_list', {
        params: { search: query, limit: 60 },
      });
      if (res.data && res.data.data) {
        setProducts(res.data.data);
      }
    } catch (e) {
      console.error('Fetch products error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/payment-methods');
      if (Array.isArray(res.data)) {
        setPaymentMethods(res.data);
        if (res.data.length > 0) {
          setSelectedPaymentMethod(res.data[0].name);
        }
      }
    } catch (e) {
      console.warn('Fetch payment methods error:', e);
    }
  }, [apiClient]);

  const loadHeldBills = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(HELD_BILLS_STORAGE);
      if (saved) {
        setHeldBills(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Load held bills error:', e);
    }
  }, []);

  useEffect(() => {
    checkActiveSession();
    fetchProducts();
    fetchPaymentMethods();
    loadHeldBills();
  }, [checkActiveSession, fetchProducts, fetchPaymentMethods, loadHeldBills]);

  // Open Session
  const handleOpenSession = async () => {
    const openingBalance = parseFloat(openingBalanceInput.replace(/[^0-9]/g, '')) || 0;
    try {
      setIsOpeningSession(true);
      const res = await apiClient.post('/api/pos-sessions/open', {
        openingBalance,
      });
      if (res.data) {
        setSession(res.data);
        Alert.alert('Sukses', 'Sesi kasir berhasil dibuka!');
      }
    } catch (e: any) {
      Alert.alert('Gagal Buka Sesi', e.response?.data?.message || 'Gagal membuka sesi kasir');
    } finally {
      setIsOpeningSession(false);
    }
  };

  // Close Session
  const handleCloseSession = async () => {
    if (!session) return;
    const actualCash = parseFloat(closingCashActual.replace(/[^0-9]/g, '')) || 0;
    try {
      setIsClosingSession(true);
      await apiClient.post('/api/pos-sessions/close', {
        sessionId: session.id,
        actualCash,
      });
      setShowCloseModal(false);
      setSession(null);
      setCart([]);
      Alert.alert('Sukses', 'Sesi kasir berhasil ditutup.');
    } catch (e: any) {
      Alert.alert('Gagal Tutup Sesi', e.response?.data?.message || 'Gagal menutup sesi kasir');
    } finally {
      setIsClosingSession(false);
    }
  };

  // Cart Calculations
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = Math.max(0, subtotal - totalDiscount);
    const numericPaid = parseFloat(paidAmount.replace(/[^0-9]/g, '')) || 0;
    const change = Math.max(0, numericPaid - total);
    return { subtotal, totalDiscount, total, numericPaid, change };
  }, [cart, paidAmount]);

  // Add Item to Cart
  const addToCart = (product: Product, level = 1) => {
    const detailId = product[`id${level}`] || product.id;
    const unitName = product[`unit${level}`] || product.unit1 || 'Pcs';
    const price = product[`PriceA${level}`] || product.PriceA1 || 0;
    const baseRatio = product[`ratio${level}`] || 1;

    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id && item.level === level);
      if (idx > -1) {
        const next = [...prev];
        next[idx].qty += 1;
        return next;
      }
      return [
        ...prev,
        {
          id: detailId,
          product,
          qty: 1,
          level,
          unitName,
          price,
          discount: 0,
          baseRatio,
        },
      ];
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[index].qty + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index].qty = newQty;
      return next;
    });
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Hold / Recall Bills
  const handleHoldBill = async () => {
    if (cart.length === 0) {
      Alert.alert('Keranjang Kosong', 'Tidak ada item untuk ditahan.');
      return;
    }
    const newHold: HeldBill = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      customerName: customer.name,
      cart,
      total: cartTotals.total,
    };
    const updated = [newHold, ...heldBills];
    setHeldBills(updated);
    await AsyncStorage.setItem(HELD_BILLS_STORAGE, JSON.stringify(updated));
    setCart([]);
    setCustomer({ name: 'Pelanggan Umum' });
    Alert.alert('Sukses', 'Pesanan berhasil ditahan.');
  };

  const handleRecallBill = async (held: HeldBill) => {
    if (cart.length > 0) {
      Alert.alert(
        'Ganti Pesanan',
        'Keranjang saat ini masih terisi. Tahan pesanan aktif terlebih dahulu sebelum memanggil pesanan lain.',
      );
      return;
    }
    setCart(held.cart);
    setCustomer({ name: held.customerName });
    const remaining = heldBills.filter(h => h.id !== held.id);
    setHeldBills(remaining);
    await AsyncStorage.setItem(HELD_BILLS_STORAGE, JSON.stringify(remaining));
    setShowHeldBillsModal(false);
  };

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!session) {
      Alert.alert('Error', 'Sesi kasir aktif belum tersedia.');
      return;
    }
    if (cartTotals.numericPaid < cartTotals.total && selectedPaymentMethod === 'cash') {
      Alert.alert('Pembayaran Kurang', 'Jumlah bayar kurang dari total belanja.');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        posSessionId: session.id,
        customerId: customer.id || null,
        paymentMethod: selectedPaymentMethod,
        subtotal: cartTotals.subtotal,
        totalDiscount: cartTotals.totalDiscount,
        totalTax: 0,
        totalAmount: cartTotals.total,
        paidAmount: cartTotals.numericPaid || cartTotals.total,
        changeAmount: cartTotals.change,
        details: cart.map(item => ({
          productId: item.product.id,
          productDetailId: item.id,
          qty: item.qty,
          price: item.price,
          discount: item.discount,
          amount: item.qty * item.price - item.discount,
          baseRatio: item.baseRatio,
        })),
      };

      const res = await apiClient.post('/api/pos/checkout', payload);
      if (res.status === 201 || res.status === 200) {
        const receiptData = {
          invoice: res.data.invoice || `INV-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString(),
          customerName: customer.name,
          cashierName: session.userName || 'Kasir',
          items: [...cart],
          totals: { ...cartTotals },
          paymentMethod: selectedPaymentMethod,
        };

        setLastReceipt(receiptData);
        setCart([]);
        setPaidAmount('');
        setShowCheckoutModal(false);
        setShowCartModal(false);
        setShowReceiptModal(true);
      }
    } catch (e: any) {
      Alert.alert('Transaksi Gagal', e.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Cash Denominations
  const quickCashOptions = [
    { label: 'Uang Pas', value: cartTotals.total },
    { label: '10.000', value: 10000 },
    { label: '20.000', value: 20000 },
    { label: '50.000', value: 50000 },
    { label: '100.000', value: 100000 },
    { label: '200.000', value: 200000 },
  ];

  if (isCheckingSession) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-xs text-muted-foreground mt-2">Memeriksa sesi kasir...</Text>
      </View>
    );
  }

  // View: Session Opener when no active session
  if (!session) {
    return (
      <View className="flex-1 bg-background justify-center px-6">
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mb-3">
            <DollarSign size={32} color="#10b981" />
          </View>
          <Text className="text-2xl font-black text-foreground">Buka Sesi Kasir (POS)</Text>
          <Text className="text-xs text-muted-foreground mt-1 text-center">
            Mulai sesi penjualan baru. Masukkan modal awal / kas laci kasir.
          </Text>
        </View>

        <Card className="p-5 bg-card border border-border rounded-2xl mb-6">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Modal Kas Awal (Opening Float)
          </Text>
          <TextInput
            value={openingBalanceInput}
            onChangeText={setOpeningBalanceInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            className="p-4 rounded-xl bg-background border border-border text-foreground font-black text-xl"
          />
        </Card>

        <Button
          label={isOpeningSession ? 'Membuka...' : 'Buka Kasir Sekarang'}
          onPress={handleOpenSession}
          disabled={isOpeningSession}
          className="bg-emerald-600 active:bg-emerald-700 py-4 rounded-2xl"
        />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-4 py-3 items-center"
        >
          <Text className="text-xs font-bold text-muted-foreground">Kembali ke Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header Bar */}
      <View className="px-4 py-3 bg-card border-b border-border flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 rounded-xl bg-secondary/30"
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text className="text-sm font-black text-foreground">Point of Sale (POS)</Text>
            <Text className="text-[10px] text-muted-foreground">
              Kasir: {session.userName || 'Admin'} • Buka: {moment(session.openedAt).format('HH:mm')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Held Bills Badge */}
          {heldBills.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowHeldBillsModal(true)}
              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-row items-center gap-1"
            >
              <PauseCircle size={16} color="#f59e0b" />
              <Text className="text-xs font-bold text-amber-500">{heldBills.length}</Text>
            </TouchableOpacity>
          )}

          {/* Close Session Button */}
          <TouchableOpacity
            onPress={() => setShowCloseModal(true)}
            className="p-2 rounded-xl bg-destructive/10 border border-destructive/20"
          >
            <DoorOpen size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer Bar & Search Bar */}
      <View className="p-4 bg-background gap-3">
        {/* Customer Selector Pill */}
        <TouchableOpacity
          onPress={() => setShowCustomerModal(true)}
          className="flex-row items-center justify-between p-3 rounded-xl bg-card border border-border"
        >
          <View className="flex-row items-center gap-2">
            <User size={16} color="#10b981" />
            <Text className="text-xs font-bold text-foreground">{customer.name}</Text>
          </View>
          <ChevronDown size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Product Search Input */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-card border border-border rounded-xl px-3 py-2">
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={searchText}
              onChangeText={text => {
                setSearchText(text);
                fetchProducts(text);
              }}
              placeholder="Cari produk / scan barcode..."
              placeholderTextColor={colors.mutedForeground}
              className="flex-1 ml-2 text-foreground text-xs p-0"
            />
            {searchText ? (
              <TouchableOpacity onPress={() => { setSearchText(''); fetchProducts(''); }}>
                <X size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2.5 rounded-xl bg-card border border-border"
          >
            {viewMode === 'grid' ? (
              <ListIcon size={18} color={colors.foreground} />
            ) : (
              <LayoutGrid size={18} color={colors.foreground} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Catalog Grid / List */}
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const inCartCount = cart
            .filter(c => c.product.id === item.id)
            .reduce((sum, c) => sum + c.qty, 0);

          if (viewMode === 'list') {
            return (
              <TouchableOpacity
                onPress={() => addToCart(item, 1)}
                className="flex-row items-center justify-between p-3.5 mb-2 rounded-2xl bg-card border border-border active:bg-secondary/20"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                    {item.Name}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground mt-0.5">
                    Stok: {item.Stock ?? 0} {item.unit1 || 'Pcs'}
                  </Text>
                  <Text className="text-xs font-black text-emerald-500 mt-1">
                    Rp {numberWithComma(item.PriceA1 || 0)}
                  </Text>
                </View>

                {inCartCount > 0 && (
                  <View className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <Text className="text-xs font-bold text-emerald-400">{inCartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              onPress={() => addToCart(item, 1)}
              className="flex-1 m-1 p-3.5 rounded-2xl bg-card border border-border justify-between active:bg-secondary/20 min-h-[110px]"
            >
              <View>
                <Text className="text-xs font-bold text-foreground" numberOfLines={2}>
                  {item.Name}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-1">
                  Stok: {item.Stock ?? 0}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border/40">
                <Text className="text-xs font-black text-emerald-500">
                  Rp {numberWithComma(item.PriceA1 || 0)}
                </Text>
                {inCartCount > 0 && (
                  <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
                    <Text className="text-[10px] font-black text-white">{inCartCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border flex-row items-center justify-between shadow-2xl"
        >
          <TouchableOpacity
            onPress={() => setShowCartModal(true)}
            className="flex-row items-center gap-3"
          >
            <View className="w-12 h-12 rounded-2xl bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShoppingCart size={22} color="#ffffff" />
            </View>
            <View>
              <Text className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {cart.reduce((s, c) => s + c.qty, 0)} Item • Ketuk Detail
              </Text>
              <Text className="text-lg font-black text-foreground">
                Rp {numberWithComma(cartTotals.total)}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleHoldBill}
              className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30"
            >
              <PauseCircle size={18} color="#f59e0b" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPaidAmount(cartTotals.total.toString());
                setShowCheckoutModal(true);
              }}
              className="px-5 py-3.5 rounded-2xl bg-emerald-600 active:bg-emerald-700 shadow-lg shadow-emerald-600/30"
            >
              <Text className="text-xs font-black text-white uppercase tracking-wider">
                Bayar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Cart Detail Modal */}
      <Modal visible={showCartModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="bg-card rounded-t-3xl max-h-[85%] border-t border-border p-4"
          >
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <Text className="text-base font-black text-foreground">Detail Keranjang Belanja</Text>
              <TouchableOpacity onPress={() => setShowCartModal(false)} className="p-1">
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView className="my-3 max-h-96">
              {cart.map((item, idx) => (
                <View
                  key={`${item.product.id}-${item.level}`}
                  className="flex-row items-center justify-between p-3 mb-2 rounded-2xl bg-background border border-border"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                      {item.product.Name}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground mt-0.5">
                      {item.unitName} @ Rp {numberWithComma(item.price)}
                    </Text>
                    <Text className="text-xs font-black text-emerald-500 mt-1">
                      Rp {numberWithComma(item.qty * item.price)}
                    </Text>
                  </View>

                  {/* Quantity Controls */}
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => updateCartQty(idx, -1)}
                      className="w-8 h-8 rounded-xl bg-card border border-border items-center justify-center"
                    >
                      <Minus size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text className="text-sm font-black text-foreground min-w-[20px] text-center">
                      {item.qty}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateCartQty(idx, 1)}
                      className="w-8 h-8 rounded-xl bg-card border border-border items-center justify-center"
                    >
                      <Plus size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeCartItem(idx)}
                      className="w-8 h-8 rounded-xl bg-destructive/10 items-center justify-center ml-1"
                    >
                      <Trash2 size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Total breakdown */}
            <View className="p-3 rounded-2xl bg-background border border-border mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-muted-foreground">Subtotal</Text>
                <Text className="text-xs font-bold text-foreground">
                  Rp {numberWithComma(cartTotals.subtotal)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-border">
                <Text className="text-sm font-black text-foreground">Total Belanja</Text>
                <Text className="text-base font-black text-emerald-500">
                  Rp {numberWithComma(cartTotals.total)}
                </Text>
              </View>
            </View>

            <Button
              label="Lanjut ke Pembayaran"
              onPress={() => {
                setShowCartModal(false);
                setPaidAmount(cartTotals.total.toString());
                setShowCheckoutModal(true);
              }}
              className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl"
            />
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={showCheckoutModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="bg-card rounded-t-3xl max-h-[90%] border-t border-border p-4"
          >
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <Text className="text-base font-black text-foreground">Pembayaran Kasir</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} className="p-1">
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView className="my-3">
              {/* Total Due Banner */}
              <View className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center mb-4">
                <Text className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  Total Tagihan
                </Text>
                <Text className="text-3xl font-black text-emerald-400 mt-1">
                  Rp {numberWithComma(cartTotals.total)}
                </Text>
              </View>

              {/* Payment Methods */}
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Metode Pembayaran
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {paymentMethods.map(m => {
                  const isSelected = selectedPaymentMethod === m.name;
                  return (
                    <TouchableOpacity
                      key={m.id || m.name}
                      onPress={() => setSelectedPaymentMethod(m.name)}
                      className={`px-4 py-2.5 rounded-xl border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-foreground'
                        }`}
                      >
                        {m.label || m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cash Paid Amount Input */}
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Jumlah Uang Diterima
              </Text>
              <TextInput
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                className="p-3.5 rounded-xl bg-background border border-border text-foreground font-black text-xl mb-3"
              />

              {/* Quick Cash Buttons */}
              <View className="flex-row flex-wrap gap-2 mb-4">
                {quickCashOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => setPaidAmount(opt.value.toString())}
                    className="px-3 py-1.5 rounded-lg bg-secondary/30 border border-border"
                  >
                    <Text className="text-xs font-bold text-foreground">{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Change (Kembalian) Display */}
              <View className="p-3.5 rounded-2xl bg-background border border-border mb-4 flex-row justify-between items-center">
                <Text className="text-xs font-bold text-muted-foreground">Kembalian</Text>
                <Text
                  className={`text-lg font-black ${
                    cartTotals.change >= 0 ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  Rp {numberWithComma(cartTotals.change)}
                </Text>
              </View>
            </ScrollView>

            <Button
              label={isLoading ? 'Memproses...' : 'Selesaikan Transaksi (Cetak Struk)'}
              onPress={handleCheckout}
              disabled={isLoading}
              className="bg-emerald-600 active:bg-emerald-700 py-4 rounded-2xl"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceiptModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/75 p-4">
          <View className="w-full max-w-sm bg-card border border-border rounded-3xl p-5 shadow-2xl">
            <View className="items-center pb-3 border-b border-dashed border-border mb-3">
              <CheckCircle2 size={36} color="#10b981" />
              <Text className="text-base font-black text-foreground mt-2">TRANSAKSI BERHASIL</Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">
                {lastReceipt?.invoice} • {moment(lastReceipt?.date).format('DD/MM/YYYY HH:mm')}
              </Text>
            </View>

            <ScrollView className="max-h-60 mb-3">
              {lastReceipt?.items?.map((it: CartItem) => (
                <View key={it.id} className="flex-row justify-between py-1">
                  <Text className="text-xs text-foreground flex-1" numberOfLines={1}>
                    {it.qty}x {it.product.Name}
                  </Text>
                  <Text className="text-xs font-bold text-foreground">
                    Rp {numberWithComma(it.qty * it.price)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View className="pt-2 border-t border-dashed border-border mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-muted-foreground">Total</Text>
                <Text className="text-xs font-bold text-foreground">
                  Rp {numberWithComma(lastReceipt?.totals?.total || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-muted-foreground">Bayar ({lastReceipt?.paymentMethod})</Text>
                <Text className="text-xs font-bold text-foreground">
                  Rp {numberWithComma(lastReceipt?.totals?.numericPaid || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-1 border-t border-border">
                <Text className="text-xs font-black text-emerald-500">Kembalian</Text>
                <Text className="text-xs font-black text-emerald-500">
                  Rp {numberWithComma(lastReceipt?.totals?.change || 0)}
                </Text>
              </View>
            </View>

            <Button
              label="Transaksi Baru"
              onPress={() => setShowReceiptModal(false)}
              className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl"
            />
          </View>
        </View>
      </Modal>

      {/* Held Bills Modal */}
      <Modal visible={showHeldBillsModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="bg-card rounded-t-3xl max-h-[80%] border-t border-border p-4"
          >
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <Text className="text-base font-black text-foreground">Pesanan Tertahan</Text>
              <TouchableOpacity onPress={() => setShowHeldBillsModal(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView className="my-3">
              {heldBills.map(hb => (
                <TouchableOpacity
                  key={hb.id}
                  onPress={() => handleRecallBill(hb)}
                  className="p-3 mb-2 rounded-2xl bg-background border border-border flex-row items-center justify-between active:bg-secondary/20"
                >
                  <View>
                    <Text className="text-xs font-bold text-foreground">{hb.customerName}</Text>
                    <Text className="text-[10px] text-muted-foreground mt-0.5">
                      {moment(hb.timestamp).format('HH:mm')} • {hb.cart.length} item
                    </Text>
                  </View>
                  <Text className="text-xs font-black text-emerald-500">
                    Rp {numberWithComma(hb.total)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Close Session Modal */}
      <Modal visible={showCloseModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/75 p-6">
          <View className="w-full max-w-sm bg-card border border-border rounded-3xl p-5">
            <Text className="text-base font-black text-foreground mb-1">Tutup Sesi Kasir</Text>
            <Text className="text-xs text-muted-foreground mb-4">
              Hitung uang fisik di laci kasir dan masukkan totalnya di bawah.
            </Text>

            <TextInput
              value={closingCashActual}
              onChangeText={setClosingCashActual}
              keyboardType="numeric"
              placeholder="Total Kas Fisik di Laci"
              placeholderTextColor={colors.mutedForeground}
              className="p-3.5 rounded-xl bg-background border border-border text-foreground font-black text-base mb-4"
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowCloseModal(false)}
                className="flex-1 p-3.5 rounded-2xl bg-secondary/30 items-center"
              >
                <Text className="text-xs font-bold text-foreground">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCloseSession}
                disabled={isClosingSession}
                className="flex-1 p-3.5 rounded-2xl bg-destructive items-center"
              >
                <Text className="text-xs font-bold text-white">
                  {isClosingSession ? 'Menutup...' : 'Tutup Kasir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
