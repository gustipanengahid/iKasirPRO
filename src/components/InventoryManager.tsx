import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Upload,
  Layers,
  X,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, ProductVariant, Category } from "../types";
import { supabase } from "../lib/supabaseClient";

interface InventoryManagerProps {
  products?: Product[];
  categories?: Category[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  onAddProduct?: (newProdData: Omit<Product, "id">) => void;
  onUpdateProduct?: (updatedProd: Product) => void;
}

interface AttributeGroup {
  name: string; // Contoh: "Warna", "Ukuran"
  options: string[]; // Contoh: ["Hitam", "Putih"] atau ["S", "M", "L"]
}

const compressImageToBase64 = (
  file: File,
  maxWidth = 300,
  maxHeight = 300,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((height * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/png");
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const formatCurrency = (value: number | string) => {
  if (value === "" || value === undefined || value === null) return "0";
  const numericValue =
    typeof value === "string" ? value.replace(/\D/g, "") : value.toString();
  if (!numericValue) return "0";
  const num = Number(numericValue);
  return isNaN(num) ? "0" : num.toLocaleString("id-ID");
};

const parseCurrency = (value: string) => {
  const numericValue = value.replace(/\D/g, "");
  return numericValue ? parseInt(numericValue, 10) : 0;
};

export default function InventoryManager({
  products = [],
  categories = [],
  setProducts,
  onAddProduct,
  onUpdateProduct,
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [categoriesList, setCategoriesList] = useState<Category[]>(categories);

  useEffect(() => {
    if (setProducts) {
      fetchProducts();
    }
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (categories && categories.length > 0) {
      setCategoriesList(categories);
      return;
    }

    const { data, error } = await supabase.from("categories").select("*");

    if (error) {
      console.error("Gagal memuat kategori dari Supabase:", error.message);
      setCategoriesList([]);
    } else if (data && data.length > 0) {
      const formattedCategories: Category[] = data.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || "",
      }));
      setCategoriesList(formattedCategories);
    } else {
      setCategoriesList([]);
    }
  };

  const fetchProducts = async () => {
    if (!setProducts) return;
    setLoading(true);

    const { data: itemsData, error: itemsError } = await supabase
      .from("items")
      .select("*");

    if (itemsError) {
      console.error("Error fetching products:", itemsError.message);
      showToast("Gagal memuat produk dari database.", "warning");
      setLoading(false);
      return;
    }

    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("*");

    if (itemsData) {
      const formattedProducts: Product[] = itemsData.map((item: any) => {
        const itemVariants = (variantsData || [])
          .filter((v: any) => v.product_id === item.id)
          .map((v: any) => ({
            id: v.id,
            productId: v.product_id,
            sku: v.sku || "",
            attributes:
              typeof v.attributes === "string"
                ? JSON.parse(v.attributes)
                : v.attributes || {},
            price: Number(v.price) || 0,
            costPrice: Number(v.cost_price) || 0,
            stock: Number(v.stock) || 0,
            minStock: Number(v.min_stock) || 5,
          }));

        const totalVariantStock = itemVariants.reduce(
          (acc: number, curr: ProductVariant) => acc + curr.stock,
          0,
        );

        return {
          id: item.id,
          sku: item.sku || `PROD-${item.id}`,
          name: item.name || "",
          category: item.category || "Umum",
          price: Number(item.price) || 0,
          costPrice: Number(item.cost_price ?? item.costPrice) || 0,
          stock: item.has_variants
            ? totalVariantStock
            : Number(item.stock) || 0,
          minStock: Number(item.min_stock ?? item.minStock) || 5,
          imageUrl: item.image_url || item.imageUrl || "",
          hasVariants: item.has_variants ?? false,
          variants: itemVariants,
        };
      });

      setProducts(formattedProducts);
    }

    setLoading(false);
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // State Manajemen Varian Bertingkat
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([]);
  const [newAttrName, setNewAttrName] = useState("");
  const [attrOptionInputs, setAttrOptionInputs] = useState<
    Record<number, string>
  >({});
  const [variantsList, setVariantsList] = useState<Partial<ProductVariant>[]>(
    [],
  );

  // State untuk Input Masal & Filter Spesifik
  const [selectedFilterOption, setSelectedFilterOption] =
    useState<string>("ALL"); // "ALL" atau opsi spesifik seperti "S", "M", "Hitam"
  const [bulkCostPrice, setBulkCostPrice] = useState<number>(0);
  const [bulkPrice, setBulkPrice] = useState<number>(0);
  const [bulkStock, setBulkStock] = useState<number>(0);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "warning";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "warning" = "warning",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = useMemo(() => {
    return safeProducts.filter((p) => {
      const matchSearch =
        (p.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (p.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [safeProducts, searchTerm, selectedCategory]);

  // Daftar Semua Opsi Atribut Unik yang Tersedia (untuk dropdown filter masal)
  const availableAttributeOptions = useMemo(() => {
    const optionsSet = new Set<string>();
    attributeGroups.forEach((g) => {
      g.options.forEach((opt) => optionsSet.add(opt));
    });
    return Array.from(optionsSet);
  }, [attributeGroups]);

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setSku(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
    setName("");
    setCategory(categoriesList.length > 0 ? categoriesList[0].name : "Umum");
    setPrice(0);
    setCostPrice(0);
    setStock(0);
    setMinStock(5);
    setImageUrl("");
    setUploadStatus("");

    setHasVariants(false);
    setAttributeGroups([]);
    setAttrOptionInputs({});
    setVariantsList([]);
    setSelectedFilterOption("ALL");
    setBulkCostPrice(0);
    setBulkPrice(0);
    setBulkStock(0);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku || "");
    setName(p.name || "");
    setCategory(p.category || categoriesList[0]?.name || "Umum");
    setPrice(p.price || 0);
    setCostPrice(p.costPrice || 0);
    setStock(p.stock || 0);
    setMinStock(p.minStock ?? 5);
    setImageUrl(p.imageUrl || "");
    setUploadStatus("");

    setHasVariants(p.hasVariants || false);
    if (p.variants && p.variants.length > 0) {
      setVariantsList(p.variants);

      const reconstructed: Record<string, Set<string>> = {};
      p.variants.forEach((v) => {
        Object.entries(v.attributes || {}).forEach(([key, val]) => {
          if (!reconstructed[key]) reconstructed[key] = new Set();
          reconstructed[key].add(val);
        });
      });

      setAttributeGroups(
        Object.entries(reconstructed).map(([name, set]) => ({
          name,
          options: Array.from(set),
        })),
      );
    } else {
      setAttributeGroups([]);
      setVariantsList([]);
    }
    setAttrOptionInputs({});
    setSelectedFilterOption("ALL");
    setBulkCostPrice(0);
    setBulkPrice(0);
    setBulkStock(0);
    setIsFormOpen(true);
  };

  const handleAddAttributeGroup = () => {
    if (!newAttrName.trim()) return;
    if (
      attributeGroups.some(
        (g) => g.name.toLowerCase() === newAttrName.trim().toLowerCase(),
      )
    ) {
      showToast("Nama atribut sudah ada.", "warning");
      return;
    }

    setAttributeGroups([
      ...attributeGroups,
      { name: newAttrName.trim(), options: [] },
    ]);
    setNewAttrName("");
  };

  const handleAddAttributeOption = (groupIndex: number) => {
    const val = (attrOptionInputs[groupIndex] || "").trim();
    if (!val) return;

    const updated = [...attributeGroups];
    const targetGroup = updated[groupIndex];

    if (!targetGroup.options.includes(val)) {
      targetGroup.options.push(val);
      setAttributeGroups(updated);
      generateVariantMatrix(updated);
    }
    setAttrOptionInputs((prev) => ({ ...prev, [groupIndex]: "" }));
  };

  const handleRemoveAttributeOption = (
    groupIndex: number,
    optionIndex: number,
  ) => {
    const updated = [...attributeGroups];
    updated[groupIndex].options.splice(optionIndex, 1);
    setAttributeGroups(updated);
    generateVariantMatrix(updated);
  };

  const handleRemoveAttributeGroup = (groupIndex: number) => {
    const updated = attributeGroups.filter((_, idx) => idx !== groupIndex);
    setAttributeGroups(updated);
    generateVariantMatrix(updated);
  };

  // Generator Matriks Varian Kombinasi Atribut
  const generateVariantMatrix = (groups: AttributeGroup[]) => {
    const activeGroups = groups.filter((g) => g.options.length > 0);
    if (activeGroups.length === 0) {
      setVariantsList([]);
      return;
    }

    const CartesianProduct = (arrs: string[][]): Record<string, string>[] => {
      return arrs.reduce<Record<string, string>[]>(
        (acc, currOptions, index) => {
          const groupName = activeGroups[index].name;
          const res: Record<string, string>[] = [];
          if (acc.length === 0) {
            return currOptions.map((opt) => ({ [groupName]: opt }));
          }
          acc.forEach((prevItem) => {
            currOptions.forEach((opt) => {
              res.push({ ...prevItem, [groupName]: opt });
            });
          });
          return res;
        },
        [],
      );
    };

    const combinations = CartesianProduct(activeGroups.map((g) => g.options));

    const generatedVariants: Partial<ProductVariant>[] = combinations.map(
      (comb, idx) => {
        const attrLabel = Object.entries(comb)
          .map(([k, v]) => `${k}-${v}`)
          .join("-")
          .toUpperCase();

        const existing = variantsList.find(
          (v) => JSON.stringify(v.attributes) === JSON.stringify(comb),
        );

        return (
          existing || {
            sku: `${sku}-${attrLabel}-${idx + 1}`,
            attributes: comb,
            price: price || bulkPrice || 0,
            costPrice: costPrice || bulkCostPrice || 0,
            stock: bulkStock || 0,
            minStock: 5,
          }
        );
      },
    );

    setVariantsList(generatedVariants);
  };

  // Terapkan Harga & Stok Masal (Berdasarkan Pilihan Filter)
  const handleApplyBulkValues = () => {
    if (variantsList.length === 0) return;

    let targetCount = 0;
    const updated = variantsList.map((v) => {
      const attrValues = Object.values(v.attributes || {});
      const isTarget =
        selectedFilterOption === "ALL" ||
        attrValues.includes(selectedFilterOption);

      if (isTarget) {
        targetCount++;
        return {
          ...v,
          costPrice: bulkCostPrice > 0 ? bulkCostPrice : v.costPrice,
          price: bulkPrice > 0 ? bulkPrice : v.price,
          stock: bulkStock >= 0 ? bulkStock : v.stock,
        };
      }
      return v;
    });

    setVariantsList(updated);
    showToast(
      `Berhasil memperbarui harga & stok pada ${targetCount} varian! ⚡`,
      "success",
    );
  };

  const handleUpdateVariantField = (
    index: number,
    field: keyof ProductVariant,
    value: any,
  ) => {
    const updated = [...variantsList];
    updated[index] = { ...updated[index], [field]: value };
    setVariantsList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let productId = editingProduct?.id;

    if (editingProduct) {
      const payload = {
        sku,
        name,
        category,
        price,
        cost_price: costPrice,
        stock: hasVariants ? 0 : stock,
        min_stock: minStock,
        image_url: imageUrl,
        has_variants: hasVariants,
      };

      const { error } = await supabase
        .from("items")
        .update(payload)
        .eq("id", editingProduct.id);

      if (error) {
        console.error("Gagal update produk:", error.message);
        showToast("Gagal memperbarui produk di database.", "warning");
        return;
      }
    } else {
      const payload = {
        sku,
        name,
        category,
        price,
        cost_price: costPrice,
        stock: hasVariants ? 0 : stock,
        min_stock: minStock,
        image_url: imageUrl,
        has_variants: hasVariants,
      };

      const { data, error } = await supabase
        .from("items")
        .insert([payload])
        .select()
        .single();

      if (error || !data) {
        console.error("Gagal menambah produk:", error?.message);
        showToast("Gagal menambahkan produk ke database.", "warning");
        return;
      }
      productId = data.id;
    }

    if (hasVariants && productId) {
      if (editingProduct) {
        await supabase
          .from("product_variants")
          .delete()
          .eq("product_id", productId);
      }

      if (variantsList.length > 0) {
        const variantsPayload = variantsList.map((v) => ({
          product_id: productId,
          sku: v.sku || `${sku}-${Math.random().toString(36).substring(7)}`,
          attributes: v.attributes || {},
          price: Number(v.price) || 0,
          cost_price: Number(v.costPrice) || 0,
          stock: Number(v.stock) || 0,
          min_stock: Number(v.minStock) || 5,
        }));

        const { error: variantErr } = await supabase
          .from("product_variants")
          .insert(variantsPayload);

        if (variantErr) {
          console.error("Gagal menyimpan varian:", variantErr.message);
          showToast("Produk tersimpan, tetapi varian gagal.", "warning");
        }
      }
    }

    if (setProducts) fetchProducts();
    showToast("Produk berhasil disimpan! ✅", "success");
    setIsFormOpen(false);
  };

  const handleDelete = (p: Product) => {
    setProductToDelete(p);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", productToDelete.id);

    if (error) {
      console.error("Gagal menghapus produk:", error.message);
      showToast("Gagal menghapus produk dari database.", "warning");
    } else {
      if (setProducts) fetchProducts();
      showToast("Produk berhasil dihapus.", "success");
    }
    setProductToDelete(null);
  };

  const handleQuickStock = async (p: Product, change: number) => {
    if (p.hasVariants) {
      showToast(
        "Kelola stok varian secara langsung melalui menu Edit.",
        "warning",
      );
      return;
    }

    const currentStock = Number(p.stock) || 0;
    const newStock = Math.max(0, currentStock + change);

    if (setProducts) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, stock: newStock } : item,
        ),
      );
    }

    const { error } = await supabase
      .from("items")
      .update({ stock: newStock })
      .eq("id", p.id);

    if (error) {
      console.error("Gagal memperbarui stok:", error.message);
      if (setProducts) fetchProducts();
    }
  };

  return (
    <div className="space-y-4 w-full h-full p-0 relative flex flex-col font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl shadow-xl border flex items-center gap-2.5 bg-white border-orange-100 text-slate-800 min-w-[280px] max-w-[90vw]"
          >
            <div className="p-1 bg-orange-50 rounded-lg text-orange-500 shrink-0">
              <AlertTriangle size={15} />
            </div>
            <span className="text-xs font-bold leading-normal">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={22} />
              </div>

              <h3 className="font-extrabold text-slate-800 text-sm">
                Konfirmasi Hapus Produk
              </h3>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus produk{" "}
                <span className="font-bold text-slate-700">
                  "{productToDelete.name}"
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="p-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs cursor-pointer transition-colors shadow-sm shadow-red-100"
                >
                  Hapus Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-3 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 p-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter
                size={14}
                className="text-slate-400 shrink-0 hidden sm:block"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto p-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500"
              >
                <option value="all">Semua Kategori</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleOpenAddForm}
              className="w-full sm:w-auto p-2.5 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus size={16} />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-center p-8 text-slate-400 text-xs">
              Memuat data inventaris...
            </div>
          ) : (
            <>
              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="py-3.5 px-4">SKU / Kode</th>
                      <th className="py-3.5 px-4">Nama Produk</th>
                      <th className="py-3.5 px-4">Kategori</th>
                      <th className="py-3.5 px-4 text-right">Harga Modal</th>
                      <th className="py-3.5 px-4 text-right">Harga Jual</th>
                      <th className="py-3.5 px-4 text-center">Total Stok</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => {
                        const currentStock = Number(p.stock) || 0;
                        const minStockVal = Number(p.minStock) || 0;
                        const isLowStock = currentStock <= minStockVal;

                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-4 px-4 font-mono font-bold text-slate-800">
                              {p.sku}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800">
                              <div className="flex items-center gap-3">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-9 h-9 rounded-xl object-contain p-0.5 bg-white shrink-0 border border-slate-100"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center shrink-0 text-[10px] uppercase">
                                    No Pic
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="truncate max-w-[200px]">
                                    {p.name}
                                  </span>
                                  {p.hasVariants && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md w-fit mt-0.5">
                                      <Layers size={10} />{" "}
                                      {p.variants?.length || 0} Varian
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl font-medium text-[10px]">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-slate-600">
                              {p.hasVariants
                                ? "-"
                                : formatCurrency(p.costPrice)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">
                              {p.hasVariants ? "-" : formatCurrency(p.price)}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                {!p.hasVariants && (
                                  <button
                                    onClick={() => handleQuickStock(p, -1)}
                                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                )}
                                <span
                                  className={`min-w-8 text-center font-bold px-2 py-0.5 rounded-lg ${
                                    isLowStock
                                      ? "bg-orange-50 text-orange-600 font-extrabold border border-orange-100"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {currentStock}
                                </span>
                                {!p.hasVariants && (
                                  <button
                                    onClick={() => handleQuickStock(p, 5)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold h-6 px-2 rounded-lg text-[10px] flex items-center justify-center cursor-pointer"
                                  >
                                    +5
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditForm(p)}
                                  className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl cursor-pointer transition-colors flex items-center gap-1 font-bold text-xs"
                                >
                                  <Edit2 size={13} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(p)}
                                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer transition-colors flex items-center gap-1 font-bold text-xs"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center p-8 text-slate-400"
                        >
                          Tidak ada produk dalam daftar inventaris Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Form Tambah / Edit Produk */}
      {isFormOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {editingProduct
                    ? "Ubah Informasi Produk"
                    : "Tambah Produk Inventaris"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Konfigurasikan harga, stok, dan matriks varian bertingkat.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Kode SKU / Barcode
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold uppercase text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Kategori Utama
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                  Nama Produk Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                />
              </div>

              {/* Toggle Varian */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-xs text-slate-800 block">
                    Varian Produk
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Aktifkan untuk produk dengan pilihan.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {!hasVariants ? (
                /* Form Produk Biasa (Tanpa Varian) */
                <>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                        Biaya Modal (HPP)
                      </label>
                      <input
                        type="text"
                        required
                        value={formatCurrency(costPrice)}
                        onChange={(e) =>
                          setCostPrice(parseCurrency(e.target.value))
                        }
                        className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                        Harga Jual (Retail)
                      </label>
                      <input
                        type="text"
                        required
                        value={formatCurrency(price)}
                        onChange={(e) =>
                          setPrice(parseCurrency(e.target.value))
                        }
                        className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                        Stok Awal
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={stock}
                        onChange={(e) =>
                          setStock(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                        Batas Minimum Stok
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={minStock}
                        onChange={(e) =>
                          setMinStock(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Pembuat Matriks Varian Bertingkat */
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h4 className="font-extrabold text-xs text-slate-800">
                    Konfigurasi Varian
                  </h4>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Varian Baru"
                      value={newAttrName}
                      onChange={(e) => setNewAttrName(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttributeGroup}
                      className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      + Atribut
                    </button>
                  </div>

                  {attributeGroups.map((group, groupIdx) => (
                    <div
                      key={groupIdx}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                          Atribut {groupIdx + 1}: {group.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttributeGroup(groupIdx)}
                          className="text-rose-500 hover:text-rose-600 text-[10px] font-bold cursor-pointer"
                        >
                          Hapus Group
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {group.options.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="bg-white border border-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 shadow-2xs"
                          >
                            {opt}
                            <X
                              size={11}
                              className="cursor-pointer text-slate-400 hover:text-rose-500"
                              onClick={() =>
                                handleRemoveAttributeOption(groupIdx, optIdx)
                              }
                            />
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder={`Pilihan ${group.name} (misal: ${
                            group.name.toLowerCase().includes("warna")
                              ? "A, B"
                              : "A, B, C"
                          })`}
                          value={attrOptionInputs[groupIdx] || ""}
                          onChange={(e) =>
                            setAttrOptionInputs((prev) => ({
                              ...prev,
                              [groupIdx]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddAttributeOption(groupIdx);
                            }
                          }}
                          className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAttributeOption(groupIdx)}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Tambah Opsi
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Pengaturan Harga & Stok Masal dengan Pilihan Kombinasi Spesifik */}
                  {variantsList.length > 0 && (
                    <div className="p-3.5 bg-orange-50/60 border border-orange-100 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-orange-800">
                          <Zap
                            size={14}
                            className="fill-orange-500 text-orange-500"
                          />
                          <span className="font-extrabold text-xs">
                            Atur Masal
                          </span>
                        </div>

                        {/* Dropdown Filter untuk Atur Semua atau Spesifik per Opsi (misal: hanya S, L, XL) */}
                        <div className="flex items-center gap-1 bg-white border border-orange-200 px-2 py-1 rounded-xl">
                          <SlidersHorizontal
                            size={11}
                            className="text-orange-500"
                          />
                          <select
                            value={selectedFilterOption}
                            onChange={(e) =>
                              setSelectedFilterOption(e.target.value)
                            }
                            className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="ALL">
                              Semua ({variantsList.length} Varian)
                            </option>
                            {availableAttributeOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                Hanya Opsi: "{opt}"
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-tight">
                        {selectedFilterOption === "ALL"
                          ? `Terapkan harga & stok serentak ke seluruh ${variantsList.length} varian.`
                          : `Terapkan harga & stok khusus hanya untuk kombinasi dengan opsi "${selectedFilterOption}".`}
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                            HPP Masal (Rp)
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={bulkCostPrice || ""}
                            onChange={(e) =>
                              setBulkCostPrice(Number(e.target.value))
                            }
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                            Harga Jual Masal (Rp)
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={bulkPrice || ""}
                            onChange={(e) =>
                              setBulkPrice(Number(e.target.value))
                            }
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                            Stok Masal
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={bulkStock || ""}
                            onChange={(e) =>
                              setBulkStock(Number(e.target.value))
                            }
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyBulkValues}
                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs transition-all flex items-center justify-center gap-1"
                      >
                        ⚡ Terapkan
                        {selectedFilterOption === "ALL"
                          ? ` ke Semua ${variantsList.length} Varian`
                          : ` Khusus Varian "${selectedFilterOption}"`}
                      </button>
                    </div>
                  )}

                  {/* Tabel Matriks Hasil Kombinasi Varian */}
                  {variantsList.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="font-extrabold text-xs text-slate-800">
                        Matriks Varian ({variantsList.length} Kombinasi)
                      </h4>

                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {variantsList.map((v, idx) => {
                          const attrStr = Object.entries(v.attributes || {})
                            .map(([k, val]) => `${k}: ${val}`)
                            .join(" | ");

                          return (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-xs text-orange-600">
                                  {attrStr}
                                </span>
                                <input
                                  type="text"
                                  placeholder="SKU Varian"
                                  value={v.sku || ""}
                                  onChange={(e) =>
                                    handleUpdateVariantField(
                                      idx,
                                      "sku",
                                      e.target.value,
                                    )
                                  }
                                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono w-32"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                                    HPP (Rp)
                                  </label>
                                  <input
                                    type="number"
                                    value={v.costPrice || 0}
                                    onChange={(e) =>
                                      handleUpdateVariantField(
                                        idx,
                                        "costPrice",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                                    Harga Jual (Rp)
                                  </label>
                                  <input
                                    type="number"
                                    value={v.price || 0}
                                    onChange={(e) =>
                                      handleUpdateVariantField(
                                        idx,
                                        "price",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                                    Stok
                                  </label>
                                  <input
                                    type="number"
                                    value={v.stock || 0}
                                    onChange={(e) =>
                                      handleUpdateVariantField(
                                        idx,
                                        "stock",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Gambar */}
              <div className="border-t border-slate-100 pt-3.5">
                <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                  Foto / Gambar Produk
                </label>
                <div className="flex gap-3.5 items-center">
                  <div className="w-16 h-16 rounded-2xl border border-slate-200 outline-dashed outline-1 outline-slate-300 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="preview"
                          className="w-full h-full object-contain p-1 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl("");
                            setUploadStatus("");
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <Upload className="text-slate-400" size={16} />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={productFileInputRef}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setUploadStatus("Memproses gambar...");
                          const compressedBase64 =
                            await compressImageToBase64(file);
                          setImageUrl(compressedBase64);
                          setUploadStatus("Gambar berhasil dimuat! ✅");
                        } catch (err) {
                          setUploadStatus("Gagal memproses gambar.");
                        }
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => productFileInputRef.current?.click()}
                      className="p-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10px] cursor-pointer"
                    >
                      Pilih Gambar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-3 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-xs cursor-pointer shadow-xs"
                >
                  {editingProduct ? "Simpan Perubahan" : "Tambahkan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
