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
  List as ListIcon
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Loading } from '../../components/ui/loading';
import { numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';

interface Product {
  id: string;
  Name: string;
  Category: string;
  Stock: number;
  unit1: string;
  unit2: string;
  unit3: string;
  unit4: string;
  ratio1: number;
  ratio2: number;
  ratio3: number;
  ratio4: number;
  [key: string]: any;
}

interface CartItem {
  product: Product;
  qty: number;
  level: number; // 1, 2, 3, 4
  price: number;
  discount: number;
}

export function POSScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { apiClient } = useConnection();

  // State
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Load Initial Data
  useEffect(() => {
    checkActiveSession();
    fetchProducts();
    fetchPaymentMethods();
  }, []);

  const checkActiveSession = async () => {
    try {
      setIsCheckingSession(true);
      const response = await apiClient.get('/api/pos-sessions/active');
      if (response.data && response.data.id) {
        setSession(response.data);
      }
    } catch (error) {
      console.error('Check session error:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const fetchProducts = async (query = '') => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/bridge/product_stock_list', {
        params: { search: query, limit: 50 }
      });
      if (response.data && response.data.data) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await apiClient.get('/api/payment-methods');
      if (Array.isArray(response.data)) {
        setPaymentMethods(response.data);
        if (response.data.length > 0) {
          setSelectedPaymentMethod(response.data[0].name);
        }
      }
    } catch (error) {
      console.error('Fetch payment methods error:', error);
    }
  };

  const openSession = async () => {
    try {
      setIsLoading(true);
      // Opening balance could be prompted, but for now we'll use 0 or default
      const response = await apiClient.post('/api/pos-sessions/open', {
        openingBalance: 0
      });
      if (response.data) {
        setSession(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to open session');
    } finally {
      setIsLoading(false);
    }
  };

  // Cart Logic
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id && item.level === 1);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].qty += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product,
        qty: 1,
        level: 1,
        price: product.PriceA1 || 0,
        discount: 0
      }]);
    }
  };

  const updateQty = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].qty = Math.max(1, newCart[index].qty + delta);
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const totalTax = 0; // Tax logic can be added later
    const total = subtotal - totalDiscount + totalTax;
    return { subtotal, totalDiscount, totalTax, total };
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!session) {
      Alert.alert('Error', 'No active POS session');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        posSessionId: session.id,
        paymentMethod: selectedPaymentMethod,
        subtotal: cartTotals.subtotal,
        totalDiscount: cartTotals.totalDiscount,
        totalTax: cartTotals.totalTax,
        totalAmount: cartTotals.total,
        paidAmount: cartTotals.total,
        details: cart.map(item => ({
          productId: item.product.id,
          productDetailId: item.product[`id${item.level}`],
          qty: item.qty,
          price: item.price,
          discount: item.discount,
          amount: (item.qty * item.price) - item.discount,
          baseRatio: item.product[`ratio${item.level}`] || 1,
        }))
      };

      const response = await apiClient.post('/api/pos/checkout', payload);
      if (response.status === 201) {
        Alert.alert('Success', `Transaction completed: ${response.data.invoice}`);
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
      }
    } catch (error: any) {
      Alert.alert('Checkout Failed', error.response?.data?.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Renderers
  const renderProduct = ({ item }: { item: Product }) => {
    const isInCart = cart.some(c => c.product.id === item.id);
    const cartQty = cart.find(c => c.product.id === item.id)?.qty || 0;

    if (viewMode === 'list') {
      return (
        <TouchableOpacity 
          onPress={() => addToCart(item)}
          className="flex-row items-center p-3 mb-2 bg-card border border-border rounded-2xl active:bg-secondary/10"
        >
          <View className="flex-1">
            <Text className="font-bold text-foreground text-base" numberOfLines={1}>{item.Name}</Text>
            <Text className="text-xs text-muted-foreground">{item.Category || 'No Category'}</Text>
            <Text className="text-primary font-black mt-1">Rp {numberWithComma(item.PriceA1)}</Text>
          </View>
          {isInCart && (
            <View className="bg-primary px-3 py-1 rounded-full mr-2">
              <Text className="text-white font-bold text-xs">{cartQty}</Text>
            </View>
          )}
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
            <Plus size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        onPress={() => addToCart(item)}
        className="w-[48%] mb-4 p-3 bg-card border border-border rounded-3xl active:bg-secondary/10"
      >
        <Text className="font-bold text-foreground text-sm mb-1" numberOfLines={2}>{item.Name}</Text>
        <Text className="text-primary font-black text-xs mb-3">Rp {numberWithComma(item.PriceA1)}</Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-[10px] text-muted-foreground">Stock: {item.Stock}</Text>
          {isInCart ? (
             <View className="bg-primary w-6 h-6 rounded-full items-center justify-center">
                <Text className="text-white font-bold text-[10px]">{cartQty}</Text>
             </View>
          ) : (
            <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center">
              <Plus size={14} color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isCheckingSession) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 bg-background p-6 items-center justify-center">
        <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-6">
          <LayoutGrid size={48} color={colors.primary} />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center mb-2">POS Session Required</Text>
        <Text className="text-muted-foreground text-center mb-8">You need to open a session before you can start selling.</Text>
        <TouchableOpacity 
          onPress={openSession}
          className="w-full bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/20"
        >
          <Text className="text-white font-black text-lg">OPEN NEW SESSION</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="mt-4 py-2"
        >
          <Text className="text-muted-foreground font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-border bg-card">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View className="ml-2">
            <Text className="text-lg font-black text-foreground uppercase tracking-tight">Mobile POS</Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              <Text className="text-[10px] text-muted-foreground font-bold uppercase">{session.name || 'Active Session'}</Text>
            </View>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 bg-secondary/20 rounded-full"
          >
            {viewMode === 'list' ? <LayoutGrid size={20} color={colors.foreground} /> : <ListIcon size={20} color={colors.foreground} />}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowCart(true)}
            className="p-2 bg-primary/10 rounded-full relative"
          >
            <ShoppingCart size={20} color={colors.primary} />
            {cart.length > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-card">
                <Text className="text-white text-[8px] font-black">{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="p-4">
        <View className="relative">
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            <Search size={18} color={colors.mutedForeground} />
          </View>
          <Input 
            placeholder="Search products..."
            className="pl-10 h-12 bg-secondary/20 border-border/50 rounded-2xl"
            value={searchText}
            onChangeText={(txt) => {
              setSearchText(txt);
              fetchProducts(txt);
            }}
          />
        </View>
      </View>

      {/* Product List */}
      {isLoading && products.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList 
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between', paddingHorizontal: 16 } : undefined}
          contentContainerStyle={{ paddingHorizontal: viewMode === 'list' ? 16 : 0, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-muted-foreground font-bold">No products found</Text>
            </View>
          }
        />
      )}

      {/* Quick Summary Footer */}
      {cart.length > 0 && (
        <TouchableOpacity 
          onPress={() => setShowCart(true)}
          className="absolute bottom-6 left-6 right-6 bg-primary p-4 rounded-3xl flex-row items-center justify-between shadow-xl shadow-primary/30"
        >
          <View>
            <Text className="text-white/70 text-[10px] font-black uppercase tracking-widest">{cart.length} ITEMS IN CART</Text>
            <Text className="text-white text-xl font-black">Rp {numberWithComma(cartTotals.total)}</Text>
          </View>
          <View className="bg-white/20 px-4 py-2 rounded-2xl flex-row items-center">
            <Text className="text-white font-black mr-2">VIEW CART</Text>
            <ShoppingCart size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-[40px] h-[85%] p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-foreground">Your Cart</Text>
              <TouchableOpacity onPress={() => setShowCart(false)} className="p-2 bg-secondary/20 rounded-full">
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <ShoppingCart size={64} color={colors.mutedForeground} opacity={0.2} />
                <Text className="text-muted-foreground mt-4 font-bold">Your cart is empty</Text>
              </View>
            ) : (
              <React.Fragment>
                <FlatList 
                  data={cart}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item, index }) => (
                    <View className="flex-row items-center mb-4 bg-secondary/10 p-4 rounded-3xl">
                      <View className="flex-1">
                        <Text className="font-bold text-foreground" numberOfLines={1}>{item.product.Name}</Text>
                        <Text className="text-primary font-black text-xs">Rp {numberWithComma(item.price)}</Text>
                      </View>
                      <View className="flex-row items-center bg-background rounded-2xl border border-border/50 px-2">
                        <TouchableOpacity onPress={() => updateQty(index, -1)} className="p-2">
                          <Minus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text className="mx-2 font-black text-foreground">{item.qty}</Text>
                        <TouchableOpacity onPress={() => updateQty(index, 1)} className="p-2">
                          <Plus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(index)} className="ml-4 p-2 bg-red-500/10 rounded-xl">
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                
                <View className="pt-6 border-t border-border mt-auto">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-muted-foreground font-bold">Subtotal</Text>
                    <Text className="text-foreground font-bold">Rp {numberWithComma(cartTotals.subtotal)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-6">
                    <Text className="text-foreground text-xl font-black">Total</Text>
                    <Text className="text-primary text-2xl font-black">Rp {numberWithComma(cartTotals.total)}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowCheckout(true)}
                    className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/20"
                  >
                    <Text className="text-white font-black text-lg">PROCEED TO CHECKOUT</Text>
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            )}
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={showCheckout} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-card w-full rounded-[40px] p-8 shadow-2xl">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
                <CheckCircle2 size={32} color={colors.primary} />
              </View>
              <Text className="text-2xl font-black text-foreground">Checkout</Text>
              <Text className="text-muted-foreground">Select payment method</Text>
            </View>

            <View className="mb-8">
              {paymentMethods.map((m) => (
                <TouchableOpacity 
                  key={m.id}
                  onPress={() => setSelectedPaymentMethod(m.name)}
                  className={cn(
                    "flex-row items-center p-4 mb-3 rounded-2xl border-2",
                    selectedPaymentMethod === m.name ? "border-primary bg-primary/5" : "border-border bg-secondary/5"
                  )}
                >
                  <View className={cn(
                    "w-10 h-10 rounded-xl items-center justify-center mr-4",
                    selectedPaymentMethod === m.name ? "bg-primary" : "bg-muted"
                  )}>
                    {m.name.toLowerCase().includes('cash') ? 
                      <Banknote size={20} color={selectedPaymentMethod === m.name ? "#fff" : colors.mutedForeground} /> : 
                      <CreditCard size={20} color={selectedPaymentMethod === m.name ? "#fff" : colors.mutedForeground} />
                    }
                  </View>
                  <Text className={cn(
                    "font-bold text-lg",
                    selectedPaymentMethod === m.name ? "text-primary" : "text-foreground"
                  )}>{m.name}</Text>
                  {selectedPaymentMethod === m.name && (
                    <View className="ml-auto">
                      <CheckCircle2 size={20} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-secondary/10 p-4 rounded-3xl mb-8">
              <View className="flex-row justify-between items-center">
                <Text className="text-muted-foreground font-bold">Total Amount</Text>
                <Text className="text-2xl font-black text-foreground">Rp {numberWithComma(cartTotals.total)}</Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity 
                onPress={() => setShowCheckout(false)}
                className="flex-1 bg-secondary/20 py-4 rounded-2xl items-center"
              >
                <Text className="text-foreground font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleCheckout}
                disabled={isLoading}
                className="flex-[2] bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-black">PAY NOW</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
