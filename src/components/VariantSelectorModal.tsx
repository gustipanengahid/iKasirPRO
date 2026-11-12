import React, { useState, useMemo } from "react";
import { X, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { Product, ProductVariant } from "../types";

interface VariantSelectorModalProps {
  product: Product;
  onClose: () => void;
  onSelectVariant: (product: Product, variant: ProductVariant) => void;
}

export default function VariantSelectorModal({
  product,
  onClose,
  onSelectVariant,
}: VariantSelectorModalProps) {
  const variants = product.variants || [];
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Mengelompokkan varian berdasarkan atribut pertama (misal: Warna)
  const groupedVariants = useMemo(() => {
    const groups: Record<string, ProductVariant[]> = {};

    variants.forEach((v) => {
      const attrs = v.attributes || {};
      const keys = Object.keys(attrs);
      const primaryGroupKey = keys.length > 0 ? attrs[keys[0]] : "Standar";

      if (!groups[primaryGroupKey]) {
        groups[primaryGroupKey] = [];
      }
      groups[primaryGroupKey].push(v);
    });

    return groups;
  }, [variants]);

  const groupKeys = Object.keys(groupedVariants);

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            {selectedGroupKey && (
              <button
                onClick={() => setSelectedGroupKey(null)}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-orange-600 rounded-xl cursor-pointer transition-colors"
                title="Kembali"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm mt-0.5">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
          {!selectedGroupKey ? (
            /* TAMPILAN 1: PILIH WARNA (Minimalis & Sejajar) */
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-500 mb-1">
                Silakan pilih warna produk:
              </p>
              {groupKeys.map((groupName) => {
                const groupItems = groupedVariants[groupName];
                const totalStock = groupItems.reduce(
                  (acc, curr) => acc + curr.stock,
                  0,
                );
                const isAllOut = totalStock <= 0;

                return (
                  <button
                    key={groupName}
                    disabled={isAllOut}
                    onClick={() => setSelectedGroupKey(groupName)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                      isAllOut
                        ? "bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-orange-50/40 hover:border-orange-500 hover:shadow-xs cursor-pointer"
                    }`}
                  >
                    <div className="flex flex-col justify-center">
                      <span className="font-extrabold text-sm text-slate-800 group-hover:text-orange-600 transition-colors leading-tight">
                        {groupName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {groupItems.length} Pilihan Ukuran • Stok Total:{" "}
                        {totalStock}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-orange-500 group-hover:border-orange-200 transition-colors shrink-0">
                      <ChevronRight size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* TAMPILAN 2: PILIH UKURAN SETELAH WARNA DIPILIH */
            <div className="space-y-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-500">
                  Pilih ukuran untuk warna{" "}
                  <span className="text-slate-800 font-extrabold">
                    {selectedGroupKey}
                  </span>
                  :
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {groupedVariants[selectedGroupKey].map((variant) => {
                  const isOutOfStock = variant.stock <= 0;
                  const attrDetails = Object.entries(variant.attributes || {})
                    .slice(1)
                    .map(([_, val]) => `${val}`)
                    .join(" - ");

                  return (
                    <button
                      key={variant.id || variant.sku}
                      disabled={isOutOfStock}
                      onClick={() => {
                        onSelectVariant(product, variant);
                        onClose();
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isOutOfStock
                          ? "bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed"
                          : "bg-white border-slate-200 hover:border-orange-500 hover:shadow-xs cursor-pointer group"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-extrabold text-sm text-slate-800 group-hover:text-orange-600 transition-colors">
                            {attrDetails || "Standar"}
                          </span>
                          {!isOutOfStock && (
                            <CheckCircle2
                              size={15}
                              className="text-slate-300 group-hover:text-orange-500 transition-colors"
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Stok: {variant.stock}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-black text-xs text-orange-600">
                          Rp {variant.price.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          {selectedGroupKey ? (
            <button
              type="button"
              onClick={() => setSelectedGroupKey(null)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={13} /> Ganti Warna
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Pilih warna terlebih dahulu
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
