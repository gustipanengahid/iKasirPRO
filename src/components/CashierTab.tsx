import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Banknote,
  Check,
  X,
  QrCode,
  Receipt,
  Tag,
  Layers,
} from "lucide-react";
import {
  User,
  Product,
  ProductVariant,
  StoreSettings,
  Transaction,
  TransactionItem,
} from "../types";

import { supabase } from "../lib/supabaseClient";
import VariantSelectorModal from "./VariantSelectorModal";

export interface CashierTabProps {
  products: Product[];
  categories?: string[];
  currentUser?: User | null;
  onCheckoutSuccess: (newTx: Transaction) => void;
  storeSettings: StoreSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  qty: number;
}

interface PromoItem {
  id: string;
  code?: string;
  name: string;
  discount_type?: "percentage" | "fixed";
  type?: "percentage" | "fixed";
  discount_value?: number;
  discount?: number;
  value?: number;
  min_purchase?: number;
  min_amount?: number;
}

type PaymentMethodType = Transaction["paymentMethod"];

export default function CashierTab({
  products,
  categories: initialCategories = [],
  currentUser,
  onCheckoutSuccess,
  storeSettings,
  isFullscreen,
  onToggleFullscreen,
}: CashierTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [payAmount, setPayAmount] = useState<string>("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [supabaseCategories, setSupabaseCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] =
    useState<boolean>(false);

  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");

  // State untuk Modal Varian Produk
  const [selectedProductForVariant, setSelectedProductForVariant] =
    useState<Product | null>(null);

  useEffect(() => {
    const fetchDataFromSupabase = async () => {
      setIsLoadingCategories(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("name");

        if (!catError && catData) {
          const fetchedNames = catData
            .map((item: any) => item.name)
            .filter(Boolean);
          setSupabaseCategories(fetchedNames);
        }

        const { data: promoData, error: promoError } = await supabase
          .from("promos")
          .select("*")
          .eq("is_active", true);

        if (!promoError && promoData) {
          setPromos(promoData);
        }
      } catch (err) {
        console.error("Terjadi kesalahan koneksi Supabase:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchDataFromSupabase();
  }, []);

  const dynamicCategories = Array.from(
    new Set([
      ...supabaseCategories,
      ...initialCategories,
      ...products.map((p) => p.category).filter(Boolean),
    ]),
  );

  const displayCategories = ["Semua", ...dynamicCategories];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const productCat = (product.category || "").trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();

    const matchesCategory =
      selectedCategory === "Semua" || productCat === selectedCat;

    return matchesSearch && matchesCategory;
  });

  // Handle klik produk di katalog (Cek apakah memiliki varian)
  const handleProductClick = (product: Product) => {
    if (
      product.hasVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      setSelectedProductForVariant(product);
    } else {
      addToCartDirect(product);
    }
  };

  const addToCartDirect = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find(
        (item) => item.product.id === product.id && !item.variant,
      );
      if (existing) {
        if (existing.qty >= product.stock) return prevCart;
        return prevCart.map((item) =>
          item.product.id === product.id && !item.variant
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prevCart, { product, qty: 1 }];
    });
  };

  // Handle pilihan varian dari modal
  const handleSelectVariant = (product: Product, variant: ProductVariant) => {
    if (variant.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find(
        (item) =>
          item.product.id === product.id && item.variant?.id === variant.id,
      );
      if (existing) {
        if (existing.qty >= variant.stock) return prevCart;
        return prevCart.map((item) =>
          item.product.id === product.id && item.variant?.id === variant.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prevCart, { product, variant, qty: 1 }];
    });
  };

  const updateQty = (
    productId: string,
    variantId: string | undefined,
    delta: number,
  ) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          const isMatch =
            item.product.id === productId &&
            (item.variant?.id === variantId || (!item.variant && !variantId));

          if (isMatch) {
            const maxStock = item.variant
              ? item.variant.stock
              : item.product.stock;
            const newQty = item.qty + delta;
            if (newQty > maxStock) return item;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string, variantId: string | undefined) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(
            item.product.id === productId &&
            (item.variant?.id === variantId || (!item.variant && !variantId))
          ),
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
    setPayAmount("");
    setSelectedPromoId("");
  };

  const subTotal = cart.reduce((sum, item) => {
    const itemPrice = item.variant ? item.variant.price : item.product.price;
    return sum + itemPrice * item.qty;
  }, 0);

  const activePromo = promos.find((p) => p.id === selectedPromoId);
  let discountTotal = 0;
  if (activePromo) {
    const minPurchase = Number(
      activePromo.min_purchase ?? activePromo.min_amount ?? 0,
    );
    if (subTotal >= minPurchase) {
      const val = Number(
        activePromo.discount_value ??
          activePromo.discount ??
          activePromo.value ??
          0,
      );
      const type = activePromo.discount_type ?? activePromo.type ?? "fixed";

      if (type === "percentage") {
        discountTotal = (subTotal * val) / 100;
      } else {
        discountTotal = val;
      }
    }
  }

  const taxableAmount = Math.max(0, subTotal - discountTotal);
  const taxTotal = storeSettings.isTaxEnabled
    ? (taxableAmount * (storeSettings?.taxPercentage ?? 0)) / 100
    : 0;
  const grandTotal = taxableAmount + taxTotal;
  const numericPayAmount = Number(payAmount) || 0;
  const changeAmount = numericPayAmount - grandTotal;

  // Proses Checkout Atomik via RPC Supabase
  const handleProcessCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    if (paymentMethod === "cash" && numericPayAmount < grandTotal) return;

    setIsSubmitting(true);

    const formattedItems: TransactionItem[] = cart.map((item) => {
      const itemPrice = item.variant ? item.variant.price : item.product.price;
      const itemCost = item.variant
        ? item.variant.costPrice
        : item.product.costPrice;
      const variantAttrs = item.variant
        ? Object.entries(item.variant.attributes || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : undefined;

      return {
        productId: item.product.id,
        variantId: item.variant?.id,
        sku: item.variant?.sku || item.product.sku || "",
        name: item.product.name,
        variantName: variantAttrs ? `(${variantAttrs})` : undefined,
        price: itemPrice,
        costPrice: itemCost || 0,
        qty: item.qty,
        discount: 0,
        total: itemPrice * item.qty,
      };
    });

    const detectedCashierName =
      currentUser?.name ||
      currentUser?.username ||
      (currentUser as any)?.fullname ||
      (currentUser as any)?.email ||
      localStorage.getItem("cashier_name") ||
      "Kasir Utama";

    const detectedCashierId =
      currentUser?.id || (currentUser as any)?.uuid || "KASIR-01";

    const txId = "TX-" + Date.now();
    const invoiceNum = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
    const txDate = new Date().toISOString();

    const newTx: Transaction = {
      id: txId,
      invoiceNumber: invoiceNum,
      date: txDate,
      items: formattedItems,
      subTotal,
      discountTotal,
      taxTotal,
      total: grandTotal,
      paymentMethod,
      cashAmount: paymentMethod === "cash" ? numericPayAmount : undefined,
      changeAmount:
        paymentMethod === "cash" ? Math.max(0, changeAmount) : undefined,
      cashierId: detectedCashierId,
      cashierName: detectedCashierName,
    };

    try {
      const { error: rpcError } = await supabase.rpc("process_checkout", {
        p_transaction_id: txId,
        p_invoice_number: invoiceNum,
        p_sub_total: subTotal,
        p_discount_total: discountTotal,
        p_tax_total: taxTotal,
        p_total: grandTotal,
        p_payment_method: paymentMethod,
        p_cashier_id: detectedCashierId,
        p_cashier_name: detectedCashierName,
        p_items: formattedItems,
        p_cash_amount: paymentMethod === "cash" ? numericPayAmount : 0,
        p_change_amount:
          paymentMethod === "cash" ? Math.max(0, changeAmount) : 0,
      });

      if (rpcError) {
        console.error(
          "Gagal memproses transaksi atomik via RPC:",
          rpcError.message,
        );
        alert("Gagal memproses transaksi: " + rpcError.message);
        setIsSubmitting(false);
        return;
      }

      onCheckoutSuccess(newTx);
      setIsCheckoutOpen(false);
      clearCart();
    } catch (err: any) {
      console.error("Kesalahan jaringan/database:", err);
      alert("Terjadi kesalahan sistem saat menyimpan transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`w-full min-h-screen bg-slate-50/40 p-0 space-y-4 font-sans ${
        isFullscreen ? "fixed inset-0 z-50 p-3 bg-slate-50" : ""
      }`}
    >
      {/* Konten Utama: Katalog & Keranjang */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* KATALOG PRODUK (Span 8) */}
        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xs lg:col-span-8 flex flex-col overflow-hidden">
          {/* Search Bar & Tombol Fullscreen */}
          <div className="p-4 border-b border-slate-50 flex items-center gap-3 bg-white">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                type="text"
                placeholder="Cari nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:bg-white focus:border-orange-500 transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={onToggleFullscreen}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl cursor-pointer transition-colors shrink-0 flex items-center justify-center"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>

          {/* Categories Bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto border-b border-slate-50 bg-white select-none [&::-webkit-scrollbar]:hidden">
            {isLoadingCategories && displayCategories.length <= 1 && (
              <span className="text-xs text-slate-400 italic px-2 shrink-0">
                Memuat kategori...
              </span>
            )}
            {displayCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-2xl whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                  selectedCategory === cat
                    ? "bg-orange-500 text-white shadow-xs shadow-orange-500/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid Produk */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[520px] [&::-webkit-scrollbar]:hidden">
            {filteredProducts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={36} className="mb-2 opacity-20" />
                <p className="text-xs font-semibold">Produk tidak ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() =>
                        !isOutOfStock && handleProductClick(product)
                      }
                      className={`group flex flex-col justify-between p-3 bg-white border border-slate-100 rounded-2xl select-none relative overflow-hidden transition-all hover:border-orange-200 hover:shadow-sm ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed bg-slate-50"
                          : "cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="aspect-square w-full rounded-xl bg-slate-50 mb-2 overflow-hidden flex items-center justify-center shrink-0 relative">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <ShoppingCart
                              className="text-slate-300"
                              size={20}
                            />
                          )}
                          {product.hasVariants && (
                            <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                              <Layers size={9} /> Varian
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                              Habis
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Stok: {product.stock}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-1 shrink-0">
                        <span className="font-extrabold text-xs text-orange-600 truncate">
                          {product.hasVariants
                            ? "Pilih Varian"
                            : `Rp ${product.price.toLocaleString("id-ID")}`}
                        </span>
                        <div className="p-1 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                          <Plus size={12} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KERANJANG BELANJA (Span 4) */}
        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xs lg:col-span-4 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-orange-500" />
              <h3 className="font-extrabold text-xs text-slate-800">
                Keranjang Belanja
              </h3>
              <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((a, c) => a + c.qty, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-slate-400 hover:text-red-500 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 size={12} />
                <span>Bersihkan</span>
              </button>
            )}
          </div>

          {/* List Items Keranjang */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[340px] [&::-webkit-scrollbar]:hidden">
            {cart.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={28} className="mb-2 opacity-20" />
                <p className="text-xs font-semibold">Keranjang kosong</p>
              </div>
            ) : (
              cart.map((item) => {
                const itemPrice = item.variant
                  ? item.variant.price
                  : item.product.price;
                const variantAttrs = item.variant
                  ? Object.values(item.variant.attributes || {}).join(", ")
                  : null;

                return (
                  <div
                    key={`${item.product.id}-${item.variant?.id || "default"}`}
                    className="p-3 bg-slate-50/80 rounded-2xl flex items-center justify-between gap-2 border border-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-xs text-slate-800 truncate">
                        {item.product.name}
                      </h5>
                      {variantAttrs && (
                        <span className="text-[10px] font-semibold text-orange-600 block truncate">
                          ({variantAttrs})
                        </span>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Rp {itemPrice.toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                      <button
                        onClick={() =>
                          updateQty(item.product.id, item.variant?.id, -1)
                        }
                        className="p-1 hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-bold px-1.5 min-w-[20px] text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() =>
                          updateQty(item.product.id, item.variant?.id, 1)
                        }
                        className="p-1 hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        removeFromCart(item.product.id, item.variant?.id)
                      }
                      className="text-slate-300 hover:text-red-500 p-1.5 cursor-pointer transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Summary & Tombol Bayar */}
          <div className="p-4 border-t border-slate-50 bg-white space-y-2.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium">
                Rp {subTotal.toLocaleString("id-ID")}
              </span>
            </div>

            {storeSettings.isTaxEnabled && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Pajak ({storeSettings.taxPercentage}%)</span>
                <span className="font-medium">
                  Rp {taxTotal.toLocaleString("id-ID")}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Transaksi</span>
              <span className="text-orange-600 font-black text-sm">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full mt-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
            >
              <Banknote size={16} />
              <span>Bayar Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PEMILIHAN VARIAN PRODUK */}
      {selectedProductForVariant && (
        <VariantSelectorModal
          product={selectedProductForVariant}
          onClose={() => setSelectedProductForVariant(null)}
          onSelectVariant={handleSelectVariant}
        />
      )}

      {/* MODAL PEMBAYARAN KASIR */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Header Modal */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Konfirmasi Pembayaran
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Selesaikan transaksi penjualan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-5 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* KOTAK TOTAL TAGIHAN */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                    Total Tagihan
                  </span>
                  <span className="text-xl font-black text-orange-600 tracking-tight">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="text-right bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                    Jumlah Item
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {cart.reduce((a, c) => a + c.qty, 0)} Pcs
                  </span>
                </div>
              </div>

              {/* Promo / Voucher */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={11} className="text-orange-500" /> Diskon / Promo
                </label>
                <select
                  value={selectedPromoId}
                  onChange={(e) => setSelectedPromoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer transition-all"
                >
                  <option value="">Pilih Promo</option>
                  {promos.map((promo) => {
                    const promoVal = Number(
                      promo.discount_value ??
                        promo.discount ??
                        promo.value ??
                        0,
                    );
                    const promoType =
                      promo.discount_type ?? promo.type ?? "fixed";
                    return (
                      <option key={promo.id} value={promo.id}>
                        {promo.name} (
                        {promoType === "percentage"
                          ? `${promoVal}%`
                          : `Rp ${promoVal.toLocaleString("id-ID")}`}
                        )
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Metode Pembayaran */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "cash"
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote size={14} /> Tunai
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qris")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "qris"
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode size={14} /> QRIS
                  </button>
                </div>
              </div>

              {/* Input Tunai atau QRIS */}
              {paymentMethod === "cash" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Uang Diterima
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <img
                    src="/qris.png"
                    alt="Kode QRIS"
                    className="w-40 h-40 object-contain mb-2 rounded-xl bg-white p-2 border border-slate-100"
                  />
                  <span className="text-xs text-slate-800 font-bold">
                    Scan QRIS untuk pembayaran digital
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Mendukung semua aplikasi e-wallet & mobile banking
                  </span>
                </div>
              )}

              {/* Rincian Finansial Singkat */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Diskon Promo</span>
                    <span>- Rp {discountTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {storeSettings.isTaxEnabled && (
                  <div className="flex justify-between text-slate-500">
                    <span>Pajak ({storeSettings.taxPercentage}%)</span>
                    <span>Rp {taxTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {paymentMethod === "cash" && (
                  <div className="flex justify-between items-center font-bold pt-1">
                    <span className="text-slate-500">Kembalian</span>
                    <span
                      className={
                        changeAmount < 0
                          ? "text-rose-500"
                          : "text-emerald-600 font-black text-sm"
                      }
                    >
                      Rp {Math.max(0, changeAmount).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>

              {/* Tombol Aksi Selesaikan Transaksi */}
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  (paymentMethod === "cash" && numericPayAmount < grandTotal)
                }
                onClick={handleProcessCheckout}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-slate-200 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-2 mt-1"
              >
                {isSubmitting ? (
                  <span>Memproses Transaksi...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Selesaikan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
