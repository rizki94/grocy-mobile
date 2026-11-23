import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
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
  Vibration,
  ToastAndroid,
  StyleSheet,
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
  Camera as CameraIcon,
  Zap,
  Printer,
  Share2,
  Scale,
  Wallet,
} from 'lucide-react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from '../../hooks/use-connection';
import { AuthContext, UserContext } from '../../contexts/app-context';
import { useThemeColor } from '../../lib/colors';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { numberWithComma } from '../../utils/helpers';
import { playBeepSuccess, playBeepError } from '../../utils/beep-sound';
import moment from 'moment';

interface Product {
  id: string;
  Name: string;
  Category?: string;
  Stock?: number;
  barcode?: string;
  skuId?: string;
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
const CACHED_PRODUCTS_STORAGE = '@pos_cached_products';

export function POSScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { apiClient, database } = useConnection();
  const { logout } = useContext(AuthContext);
  const user = useContext(UserContext);

  // Session state
  const [session, setSession] = useState<any>(null);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCashActual, setClosingCashActual] = useState('');
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Products & Cart
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isOfflineCatalog, setIsOfflineCatalog] = useState(false);

  // Modals
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Barcode Scanner Modal (Vision Camera)
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cameraDevice = useCameraDevice('back');
  const { hasPermission: hasCameraPerm, requestPermission: reqCameraPerm } = useCameraPermission();
  const lastScannedTimeRef = useRef<number>(0);

  // Customer
  const [customer, setCustomer] = useState<{ id?: string; name: string }>({
    name: 'Pelanggan Umum',
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Held Bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);

  // Payment
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [paidAmount, setPaidAmount] = useState('');

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    }
  };

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

  // Product Catalog Fetching with Offline Cache
  const fetchProducts = useCallback(async (query = '') => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/bridge/product_stock_list', {
        params: { search: query, limit: 100 },
      });
      if (res.data && res.data.data) {
        setProducts(res.data.data);
        setIsOfflineCatalog(false);
        // Cache to local storage if it's the full catalog query
        if (!query) {
          AsyncStorage.setItem(CACHED_PRODUCTS_STORAGE, JSON.stringify(res.data.data)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Fetch products online failed, checking offline cache...', e);
      // Fallback to offline cache
      try {
        const cached = await AsyncStorage.getItem(CACHED_PRODUCTS_STORAGE);
        if (cached) {
          const parsed = JSON.parse(cached);
          const filtered = query
            ? parsed.filter((p: Product) =>
                p.Name.toLowerCase().includes(query.toLowerCase()) ||
                p.barcode?.toLowerCase().includes(query.toLowerCase()) ||
                p.skuId?.toLowerCase().includes(query.toLowerCase())
              )
            : parsed;
          setProducts(filtered);
          setIsOfflineCatalog(true);
          showToast('Menggunakan katalog offline tersimpan');
        }
      } catch (cacheErr) {
        console.error('Failed to read cached products:', cacheErr);
      }
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
        showToast('Sesi kasir berhasil dibuka!');
      }
    } catch (e: any) {
      Alert.alert('Gagal Buka Sesi', e.response?.data?.message || 'Gagal membuka sesi kasir');
    } finally {
      setIsOpeningSession(false);
    }
  };

  // Open Close Session Modal & Fetch Summary
  const handleOpenCloseModal = async () => {
    if (!session) return;
    setShowCloseModal(true);
    setIsLoadingSummary(true);
    setClosingCashActual('');
    setSessionSummary(null);
    try {
      const res = await apiClient.get(`/api/pos-sessions/${session.id}/summary`);
      if (res.data) {
        setSessionSummary(res.data);
      }
    } catch (e: any) {
      console.warn('Failed to get session summary:', e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Close Session
  const handleCloseSession = async () => {
    if (!session) return;
    const actualCash = parseFloat(closingCashActual.replace(/[^0-9]/g, '')) || 0;
    try {
      setIsClosingSession(true);
      await apiClient.post(`/api/pos-sessions/${session.id}/close`, {
        closingBalance: actualCash,
      });
      setShowCloseModal(false);
      setSession(null);
      setCart([]);
      setSessionSummary(null);
      showToast('Sesi kasir berhasil ditutup.');

      // Automatically logout if logged in via PIN mode
      if (user?.isPinSession) {
        await logout();
      }
    } catch (e: any) {
      Alert.alert('Gagal Tutup Sesi', e.response?.data?.message || 'Gagal menutup sesi kasir');
    } finally {
      setIsClosingSession(false);
    }
  };

  // Share Receipt (58mm Thermal Print Layout)
  const handleShareReceipt = async () => {
    if (!lastReceipt) return;
    try {
      const lines = [
        '================================',
        '           GROCY STORE          ',
        '================================',
        `No Nota  : ${lastReceipt.invoice || '-'}`,
        `Waktu    : ${moment(lastReceipt.date).format('DD/MM/YYYY HH:mm')}`,
        `Kasir    : ${user?.displayName || user?.name || session?.userName || 'Kasir'}`,
        `Pelanggan: ${customer?.name || 'Pelanggan Umum'}`,
        '--------------------------------',
      ];

      (lastReceipt.items || []).forEach((it: CartItem) => {
        lines.push(`${it.product.Name}`);
        lines.push(
          `  ${it.qty} x ${numberWithComma(it.price)} = Rp ${numberWithComma(it.qty * it.price)}`,
        );
      });

      lines.push('--------------------------------');
      lines.push(`Subtotal : Rp ${numberWithComma(lastReceipt.totals?.subtotal || 0)}`);
      if (lastReceipt.totals?.totalDiscount > 0) {
        lines.push(`Diskon   : Rp ${numberWithComma(lastReceipt.totals?.totalDiscount || 0)}`);
      }
      lines.push(`TOTAL    : Rp ${numberWithComma(lastReceipt.totals?.total || 0)}`);
      lines.push(
        `Bayar (${lastReceipt.paymentMethod}) : Rp ${numberWithComma(lastReceipt.totals?.numericPaid || 0)}`,
      );
      lines.push(`Kembali  : Rp ${numberWithComma(lastReceipt.totals?.change || 0)}`);
      lines.push('================================');
      lines.push(' Terima Kasih Atas Kunjungan Anda! ');
      lines.push('================================');

      await Share.share({
        message: lines.join('\n'),
        title: `Struk_${lastReceipt.invoice || 'POS'}`,
      });
    } catch (e: any) {
      console.warn('Share receipt error:', e);
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

  // Add Item to Cart with Haptics
  const addToCart = (product: Product, level = 1) => {
    try {
      Vibration.vibrate(20);
    } catch (_) {}

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
    try {
      Vibration.vibrate(15);
    } catch (_) {}

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
    try {
      Vibration.vibrate(25);
    } catch (_) {}
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Barcode Scanner Handler
  const handleOpenScanner = async () => {
    if (!hasCameraPerm) {
      const granted = await reqCameraPerm();
      if (!granted) {
        Alert.alert('Izin Kamera', 'Izin kamera dibutuhkan untuk memindai barcode produk.');
        return;
      }
    }
    setShowScannerModal(true);
  };

  const handleBarcodeScanned = useCallback((code: string) => {
    const now = Date.now();
    // Debounce barcode scan by 1.2 seconds to avoid rapid duplicate triggers
    if (now - lastScannedTimeRef.current < 1200) {
      return;
    }
    lastScannedTimeRef.current = now;

    const cleanCode = code.trim();
    // Search in current product catalog
    const found = products.find(p =>
      (p.barcode && p.barcode.trim() === cleanCode) ||
      (p.skuId && p.skuId.trim() === cleanCode) ||
      (p.id && p.id.toString() === cleanCode)
    );

    if (found) {
      playBeepSuccess();
      try {
        Vibration.vibrate(30);
      } catch (_) {}
      addToCart(found, 1);
      showToast(`${found.Name} (+1)`);
    } else {
      playBeepError();
      try {
        Vibration.vibrate(120);
      } catch (_) {}
      showToast(`Barcode ${cleanCode} tidak ditemukan`);
    }
  }, [products]);

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'code-128', 'code-39', 'qr', 'upc-a', 'upc-e'],
    onCodeScanned: codes => {
      if (codes && codes.length > 0 && codes[0].value) {
        handleBarcodeScanned(codes[0].value);
      }
    },
  });

  // Hold / Recall Bills
  const handleHoldBill = async () => {
    if (cart.length === 0) {
      showToast('Keranjang kosong, tidak ada item untuk ditahan.');
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
    showToast('Pesanan berhasil ditahan.');
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
        contactId: customer.id || null,
        customerId: customer.id || null,
        paymentMethod: selectedPaymentMethod,
        subtotal: cartTotals.subtotal,
        totalDiscount: cartTotals.totalDiscount,
        totalTax: 0,
        totalAmount: cartTotals.total,
        paidAmount: cartTotals.numericPaid || cartTotals.total,
        changeAmount: cartTotals.change,
        payments: [
          {
            method: selectedPaymentMethod,
            amount: cartTotals.numericPaid || cartTotals.total,
          },
        ],
        details: cart.map(item => ({
          productId: item.product.id,
          productDetailId: item.id,
          qty: item.qty,
          price: item.price,
          discount: item.discount || 0,
          amount: item.qty * item.price - (item.discount || 0),
          baseRatio: item.baseRatio || 1,
        })),
      };

      const res = await apiClient.post('/api/pos/checkout', payload);
      if (res.status === 201 || res.status === 200) {
        playBeepSuccess();
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
      playBeepError();
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
            Mulai sesi penjualan baru. Masukkan modal kas awal laci kasir.
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
          onPress={async () => {
            if (user?.isPinSession) {
              await logout();
            } else {
              navigation.goBack();
            }
          }}
          className="mt-4 py-3 items-center"
        >
          <Text className="text-xs font-bold text-muted-foreground">
            {user?.isPinSession ? 'Keluar dari Kasir (Logout)' : 'Kembali ke Dashboard'}
          </Text>
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
              Kasir: {session.userName || user?.displayName || 'Admin'} • Buka: {moment(session.openedAt).format('HH:mm')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Offline Badge */}
          {isOfflineCatalog && (
            <View className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Text className="text-[10px] font-bold text-amber-500">Offline Cache</Text>
            </View>
          )}

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
            onPress={handleOpenCloseModal}
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

        {/* Product Search Input + Barcode Scanner Button */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-card border border-border rounded-xl px-3 py-2">
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={searchText}
              onChangeText={text => {
                setSearchText(text);
                fetchProducts(text);
              }}
              placeholder="Cari produk / nama barang..."
              placeholderTextColor={colors.mutedForeground}
              className="flex-1 ml-2 text-foreground text-xs p-0"
            />
            {searchText ? (
              <TouchableOpacity onPress={() => { setSearchText(''); fetchProducts(''); }}>
                <X size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Camera Barcode Scanner Button */}
          <TouchableOpacity
            onPress={handleOpenScanner}
            className="p-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700"
          >
            <Barcode size={18} color="#ffffff" />
          </TouchableOpacity>

          {/* Grid / List View Toggle */}
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

      {/* Product Catalog Grid / List with High-Performance Virtualization */}
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={{ padding: 12, paddingBottom: 110 }}
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
                    Stok: {item.Stock ?? 0} {item.unit1 || 'Pcs'} {item.barcode ? `• ${item.barcode}` : ''}
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

      {/* Vision Camera Barcode Scanner Modal */}
      <Modal visible={showScannerModal} animationType="slide" transparent>
        <View className="flex-1 bg-black">
          {cameraDevice ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={cameraDevice}
              isActive={showScannerModal}
              codeScanner={codeScanner}
              torch={torchOn ? 'on' : 'off'}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white text-sm">Kamera tidak tersedia</Text>
            </View>
          )}

          {/* Scanner Overlay */}
          <View className="flex-1 justify-between p-6" style={{ paddingTop: insets.top + 16 }}>
            {/* Top Bar */}
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setShowScannerModal(false)}
                className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>

              <Text className="text-white font-bold text-sm bg-black/60 px-4 py-2 rounded-full">
                Arahkan Kamera ke Barcode
              </Text>

              <TouchableOpacity
                onPress={() => setTorchOn(!torchOn)}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  torchOn ? 'bg-amber-500' : 'bg-black/60'
                }`}
              >
                <Zap size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Viewfinder Target Box */}
            <View className="self-center w-72 h-44 rounded-3xl border-2 border-emerald-400 border-dashed bg-emerald-500/10 items-center justify-center">
              <Text className="text-emerald-300 text-xs font-bold text-center px-4">
                Pindai Barcode Produk (EAN-13, Code-128, QR)
              </Text>
            </View>

            {/* Bottom Info Bar */}
            <View className="bg-black/75 p-4 rounded-2xl items-center">
              <Text className="text-white text-xs font-bold">
                Keranjang: {cart.reduce((s, c) => s + c.qty, 0)} Item (Rp {numberWithComma(cartTotals.total)})
              </Text>
              <TouchableOpacity
                onPress={() => setShowScannerModal(false)}
                className="mt-3 px-6 py-2 rounded-full bg-emerald-600"
              >
                <Text className="text-white text-xs font-bold">Selesai Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                      onPress={() => {
                        try { Vibration.vibrate(15); } catch (_) {}
                        setSelectedPaymentMethod(m.name);
                      }}
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
                    onPress={() => {
                      try { Vibration.vibrate(15); } catch (_) {}
                      setPaidAmount(opt.value.toString());
                    }}
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

            <View className="gap-2">
              <TouchableOpacity
                onPress={handleShareReceipt}
                className="flex-row items-center justify-center gap-2 p-3.5 rounded-2xl bg-secondary/30 border border-border active:bg-secondary/60"
              >
                <Printer size={16} color={colors.foreground} />
                <Text className="text-xs font-bold text-foreground">
                  Cetak / Bagikan Struk
                </Text>
              </TouchableOpacity>

              <Button
                label="Transaksi Baru"
                onPress={() => setShowReceiptModal(false)}
                className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl"
              />
            </View>
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

      {/* Close Session Modal with Shift Summary */}
      <Modal visible={showCloseModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/80 p-4">
          <View className="w-full max-w-sm bg-card border border-border rounded-3xl p-5 shadow-2xl max-h-[90%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-border mb-3">
              <View>
                <Text className="text-base font-black text-foreground">Ringkasan Sesi Kasir</Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">
                  Buka: {moment(session?.openedAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCloseModal(false)}
                className="p-1.5 rounded-full bg-secondary/30"
              >
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-3">
              {isLoadingSummary ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text className="text-xs text-muted-foreground mt-2 font-bold">
                    Menghitung ringkasan kas masuk...
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {/* Financial Breakdown Table */}
                  <View className="p-3.5 rounded-2xl bg-background border border-border/70 gap-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-muted-foreground">Modal Kas Awal</Text>
                      <Text className="text-xs font-bold text-foreground">
                        Rp {numberWithComma(session?.openingBalance || 0)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-muted-foreground">Total Penjualan</Text>
                      <Text className="text-xs font-bold text-foreground">
                        Rp {numberWithComma(sessionSummary?.summary?.totalAmount || 0)}
                        <Text className="text-[10px] text-muted-foreground">
                          {' '}({sessionSummary?.summary?.count || 0} nota)
                        </Text>
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-muted-foreground">Kas Masuk Tunai</Text>
                      <Text className="text-xs font-bold text-emerald-500">
                        + Rp {numberWithComma(sessionSummary?.summary?.cashCollected || 0)}
                      </Text>
                    </View>

                    {/* Non-cash payments breakdown */}
                    {sessionSummary?.paymentBreakdown &&
                      sessionSummary.paymentBreakdown
                        .filter((p: any) => {
                          const m = (p.method || '').toLowerCase();
                          return !m.includes('cash') && !m.includes('tunai') && !m.includes('kas');
                        })
                        .map((p: any, idx: number) => (
                          <View key={idx} className="flex-row justify-between items-center pl-2">
                            <Text className="text-[11px] text-muted-foreground">↳ {p.method}</Text>
                            <Text className="text-[11px] font-medium text-foreground">
                              Rp {numberWithComma(p.total || 0)}
                            </Text>
                          </View>
                        ))}

                    {/* Total Settlements (pelunasan nota luar sesi) if any */}
                    {Number(sessionSummary?.summary?.totalSettlements || 0) > 0 && (
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-muted-foreground">Pelunasan Piutang Kas</Text>
                        <Text className="text-xs font-bold text-emerald-500">
                          + Rp {numberWithComma(sessionSummary.summary.totalSettlements)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Expected Cash Drawer Box */}
                  {(() => {
                    const openingBal = Number(session?.openingBalance || 0);
                    const cashCollected = Number(sessionSummary?.summary?.cashCollected || 0);
                    const settlements = Number(sessionSummary?.summary?.totalSettlements || 0);
                    const expectedCash = openingBal + cashCollected + settlements;
                    const actualCash = parseFloat(closingCashActual.replace(/[^0-9]/g, '')) || 0;
                    const diff = actualCash - expectedCash;

                    return (
                      <>
                        <View className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex-row justify-between items-center">
                          <View>
                            <Text className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                              TOTAL KAS DIHARAPKAN
                            </Text>
                            <Text className="text-[10px] text-muted-foreground">
                              (Modal Awal + Kas Masuk Tunai)
                            </Text>
                          </View>
                          <Text className="text-base font-black text-emerald-500">
                            Rp {numberWithComma(expectedCash)}
                          </Text>
                        </View>

                        {/* Actual Cash Input */}
                        <View>
                          <Text className="text-xs font-bold text-foreground mb-1.5">
                            Hitung Kas Fisik Riil di Laci:
                          </Text>
                          <TextInput
                            value={closingCashActual}
                            onChangeText={setClosingCashActual}
                            keyboardType="numeric"
                            placeholder="Masukkan jumlah uang fisik di laci"
                            placeholderTextColor={colors.mutedForeground}
                            className="p-3.5 rounded-xl bg-background border border-border text-foreground font-black text-base"
                          />
                        </View>

                        {/* Difference Indicator */}
                        {closingCashActual.trim().length > 0 && (
                          <View
                            className={`p-3 rounded-xl border flex-row justify-between items-center ${
                              diff === 0
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : diff < 0
                                ? 'bg-destructive/10 border-destructive/30'
                                : 'bg-blue-500/10 border-blue-500/30'
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                diff === 0
                                  ? 'text-emerald-500'
                                  : diff < 0
                                  ? 'text-destructive'
                                  : 'text-blue-500'
                              }`}
                            >
                              {diff === 0
                                ? '✓ Kas Pas (Sesuai)'
                                : diff < 0
                                ? '⚠ Selisih Kurang'
                                : '+ Selisih Lebih'}
                            </Text>
                            <Text
                              className={`text-xs font-black ${
                                diff === 0
                                  ? 'text-emerald-500'
                                  : diff < 0
                                  ? 'text-destructive'
                                  : 'text-blue-500'
                              }`}
                            >
                              Rp {numberWithComma(Math.abs(diff))}
                            </Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              )}
            </ScrollView>

            <View className="flex-row gap-2 pt-2 border-t border-border">
              <TouchableOpacity
                onPress={() => setShowCloseModal(false)}
                className="flex-1 p-3.5 rounded-2xl bg-secondary/30 items-center"
              >
                <Text className="text-xs font-bold text-foreground">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCloseSession}
                disabled={isClosingSession}
                className="flex-1 p-3.5 rounded-2xl bg-destructive items-center justify-center"
              >
                {isClosingSession ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">
                    Tutup Kasir
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
