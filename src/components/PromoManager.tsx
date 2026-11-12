import React, { useState, useEffect } from "react";
import { Tag, Plus, Trash2, Edit3, X, Check, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export function PromoManager() {
  const [promos, setPromos] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State untuk Modal Edit Promo
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("percentage");
  const [editValue, setEditValue] = useState("");
  const [editMinPurchase, setEditMinPurchase] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchPromos = async () => {
    const { data, error } = await supabase
      .from("promos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPromos(data);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !value) return;

    setIsLoading(true);
    const { error } = await supabase.from("promos").insert([
      {
        code: code.toUpperCase(),
        name,
        type,
        value: Number(value),
        min_purchase: Number(minPurchase) || 0,
        is_active: true,
      },
    ]);

    setIsLoading(false);
    if (!error) {
      setCode("");
      setName("");
      setValue("");
      setMinPurchase("");
      fetchPromos();
    } else {
      alert("Gagal menambah promo: " + error.message);
    }
  };

  const handleOpenEdit = (promo: any) => {
    setEditingPromo(promo);
    setEditCode(promo.code || "");
    setEditName(promo.name || "");
    setEditType(promo.type || "percentage");
    setEditValue(promo.value?.toString() || "");
    setEditMinPurchase(promo.min_purchase?.toString() || "");
  };

  const handleUpdatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editCode || !editName || !editValue) return;

    setIsSubmittingEdit(true);
    const { error } = await supabase
      .from("promos")
      .update({
        code: editCode.toUpperCase(),
        name: editName,
        type: editType,
        value: Number(editValue),
        min_purchase: Number(editMinPurchase) || 0,
      })
      .eq("id", editingPromo.id);

    setIsSubmittingEdit(false);
    if (!error) {
      setEditingPromo(null);
      fetchPromos();
    } else {
      alert("Gagal memperbarui promo: " + error.message);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (confirm("Yakin ingin menghapus promo ini?")) {
      await supabase.from("promos").delete().eq("id", id);
      fetchPromos();
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/40 p-0 space-y-4 font-sans">
      {/* Form Input Tambah Promo dalam Card Membulat */}
      <div className="w-full bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
        <form onSubmit={handleAddPromo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Kode Promo
              </label>
              <input
                type="text"
                placeholder=""
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold uppercase text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Promo
              </label>
              <input
                type="text"
                placeholder=""
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipe Diskon
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setValue("");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="percentage">Persentase</option>
                <option value="fixed">Nominal</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Nilai ({type === "percentage" ? "%" : "Rp"})
              </label>
              <input
                type="number"
                placeholder="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Min. Belanja (Opsional)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="py-2.5 px-6 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-slate-200 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Plus size={15} />
              {isLoading ? "Menyimpan..." : "Tambah Promo"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Daftar Promo dalam Card Membulat */}
      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/60 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-100 text-[10px]">
              <tr>
                <th className="p-4 px-6">Kode</th>
                <th className="p-4">Nama Promo</th>
                <th className="p-4">Diskon</th>
                <th className="p-4">Min. Belanja</th>
                <th className="p-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-orange-50 text-orange-400 rounded-2xl">
                        <AlertCircle size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        Belum Ada Promo
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Tambahkan kode promo baru menggunakan form di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                promos.map((promo) => (
                  <tr
                    key={promo.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4 px-6">
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-600 font-black rounded-lg border border-orange-100 text-[11px]">
                        {promo.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {promo.name}
                    </td>
                    <td className="p-4 font-black text-slate-700">
                      {promo.type === "percentage"
                        ? `${promo.value}%`
                        : `Rp ${Number(promo.value).toLocaleString("id-ID")}`}
                    </td>
                    <td className="p-4 font-medium text-slate-500">
                      {promo.min_purchase > 0
                        ? `Rp ${Number(promo.min_purchase).toLocaleString("id-ID")}`
                        : "Tanpa minimum"}
                    </td>
                    <td className="p-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(promo)}
                          className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                          title="Edit Promo"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Promo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Promo */}
      {editingPromo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Edit Promo / Voucer
              </h3>
              <button
                onClick={() => setEditingPromo(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdatePromo} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Kode Promo
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold uppercase text-slate-800 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Promo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Tipe Diskon
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Nilai
                  </label>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Min. Belanja (Rp)
                </label>
                <input
                  type="number"
                  value={editMinPurchase}
                  onChange={(e) => setEditMinPurchase(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check size={15} />
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
