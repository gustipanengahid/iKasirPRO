import React, { useState, useEffect } from "react";
import {
  Store,
  MapPin,
  Phone,
  Percent,
  CheckCircle,
  Save,
  Upload,
  Camera,
  Loader2,
} from "lucide-react";
import { StoreSettings } from "../types";
import { supabase } from "../lib/supabaseClient";

interface SettingsTabProps {
  settings: StoreSettings;
  onSaveSettings: (
    newSettings: StoreSettings,
    silent?: boolean,
    persistToServer?: boolean,
  ) => void;
}

export default function SettingsTab({
  settings,
  onSaveSettings,
}: SettingsTabProps) {
  const [name, setName] = useState(settings?.name || "");
  const [storeLogo, setStoreLogo] = useState(
    settings?.storeLogo || settings?.store_logo || "",
  );
  const [address, setAddress] = useState(settings?.address || "");
  const [phone, setPhone] = useState(settings?.phone || "");
  const [isTaxEnabled, setIsTaxEnabled] = useState(
    !!settings?.isTaxEnabled || !!settings?.is_tax_enabled,
  );
  const [taxPercentage, setTaxPercentage] = useState(
    settings?.taxPercentage ?? settings?.tax_percentage ?? 0,
  );

  const [isSaved, setIsSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  const propagateState = (
    updatedFields: Partial<StoreSettings>,
    persistToServer = false,
  ) => {
    onSaveSettings(
      {
        id: 1,
        name: updatedFields.name !== undefined ? updatedFields.name : name,
        storeLogo:
          updatedFields.storeLogo !== undefined
            ? updatedFields.storeLogo
            : storeLogo,
        store_logo:
          updatedFields.storeLogo !== undefined
            ? updatedFields.storeLogo
            : storeLogo,
        address:
          updatedFields.address !== undefined ? updatedFields.address : address,
        phone: updatedFields.phone !== undefined ? updatedFields.phone : phone,
        isTaxEnabled:
          updatedFields.isTaxEnabled !== undefined
            ? updatedFields.isTaxEnabled
            : isTaxEnabled,
        taxPercentage:
          updatedFields.taxPercentage !== undefined
            ? updatedFields.taxPercentage
            : taxPercentage,
      },
      true,
      persistToServer,
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar yang valid (JPG/PNG/WebP).");
      return;
    }

    try {
      setUploadingLogo(true);
      const fileExt = file.name.split(".").pop();
      const randomString = Math.random().toString(36).substring(2, 9);
      const fileName = `logo_${Date.now()}_${randomString}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicURLData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (publicURLData?.publicUrl) {
        const newUrl = publicURLData.publicUrl;
        setStoreLogo(newUrl);
        propagateState({ storeLogo: newUrl }, true);

        // Langsung simpan otomatis ke tabel settings Supabase saat logo berhasil di-upload
        await supabase.from("settings").upsert(
          [
            {
              id: 1,
              name,
              address,
              phone,
              store_logo: newUrl,
              is_tax_enabled: isTaxEnabled,
              tax_percentage: taxPercentage,
            },
          ],
          { onConflict: "id" },
        );
      }
    } catch (err: any) {
      console.error("Gagal mengunggah logo:", err.message);
      alert(err.message || "Gagal mengunggah logo toko.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    propagateState({ name: val }, false);
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    propagateState({ address: val }, false);
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    propagateState({ phone: val }, false);
  };

  const handleTaxToggleChange = (checked: boolean) => {
    setIsTaxEnabled(checked);
    propagateState({ isTaxEnabled: checked }, true);
  };

  const handleTaxPercentageChange = (val: number) => {
    setTaxPercentage(val);
    propagateState({ taxPercentage: val }, true);
  };

  useEffect(() => {
    if (!isNameFocused && settings?.name !== undefined) setName(settings.name);
    if (
      settings?.storeLogo !== undefined ||
      settings?.store_logo !== undefined
    ) {
      setStoreLogo(settings.storeLogo || settings.store_logo || "");
    }
    if (!isAddressFocused && settings?.address !== undefined)
      setAddress(settings.address);
    if (!isPhoneFocused && settings?.phone !== undefined)
      setPhone(settings.phone);
  }, [
    settings?.name,
    settings?.storeLogo,
    settings?.store_logo,
    settings?.address,
    settings?.phone,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        id: 1,
        name,
        address,
        phone,
        store_logo: storeLogo,
        is_tax_enabled: isTaxEnabled,
        tax_percentage: taxPercentage,
      };

      const { error } = await supabase
        .from("settings")
        .upsert([payload], { onConflict: "id" });

      if (error) {
        console.error("Gagal menyimpan ke tabel settings:", error.message);
        alert("Gagal menyimpan ke database: " + error.message);
        return;
      }
    } catch (err: any) {
      console.error("Gagal menyimpan ke settings:", err);
    }

    onSaveSettings(
      {
        id: 1,
        name,
        storeLogo,
        store_logo: storeLogo,
        address,
        phone,
        isTaxEnabled,
        taxPercentage,
      },
      false,
      true,
    );
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/40 p-0 space-y-4 font-sans pb-16">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card Profil Toko & Icon / Logo */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Identitas Toko
              </h3>
              <p className="text-[10px] text-slate-400">
                logo ini akan otomatis tampil di halaman Login dan struk cetak
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Upload Icon / Logo Toko */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Logo Toko
              </label>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {storeLogo ? (
                    <img
                      src={storeLogo}
                      alt="Logo Toko"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border-2 border-orange-200 shadow-xs">
                      <Store size={24} />
                    </div>
                  )}
                  <label
                    htmlFor="store-logo-upload"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
                    title="Ganti Logo Toko"
                  >
                    <Camera size={13} />
                  </label>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="store-logo-upload"
                    className="flex items-center justify-center gap-2 p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2
                          size={15}
                          className="animate-spin text-orange-500"
                        />
                        <span>Mengunggah Logo...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} className="text-orange-500" />
                        <span>Upload Logo Baru</span>
                      </>
                    )}
                  </label>
                  <input
                    id="store-logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Nama Outlet
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus-within:border-orange-500 transition-all">
                <Store className="text-slate-400 shrink-0" size={16} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                  placeholder="Contoh: iKasirPRO"
                  className="w-full bg-transparent font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Alamat Outlet
              </label>
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus-within:border-orange-500 transition-all">
                <MapPin className="text-slate-400 mt-0.5 shrink-0" size={16} />
                <textarea
                  required
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => setIsAddressFocused(true)}
                  onBlur={() => setIsAddressFocused(false)}
                  placeholder="Alamat lengkap lokasi toko..."
                  rows={2}
                  className="w-full bg-transparent font-medium text-slate-800 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Nomor Telepon
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus-within:border-orange-500 transition-all">
                <Phone className="text-slate-400 shrink-0" size={16} />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  placeholder="085858581509"
                  className="w-full bg-transparent font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card Pajak PPN */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <Percent size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Pengaturan Pajak (PPN)
              </h3>
              <p className="text-[10px] text-slate-400">
                Kalkulasi tarif pajak otomatis saat transaksi checkout
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-800">
                Aktifkan Pajak PPN
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTaxEnabled}
                  onChange={(e) => handleTaxToggleChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {isTaxEnabled && (
              <div className="flex items-center justify-between p-4 bg-orange-50/60 border border-orange-200/60 rounded-2xl">
                <span className="font-bold text-orange-800">
                  Besaran Tarif PPN (%)
                </span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-300/80 rounded-xl w-32 focus-within:ring-2 focus-within:ring-orange-500/15">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxPercentage}
                    onChange={(e) =>
                      handleTaxPercentageChange(
                        Math.max(
                          0,
                          Math.min(100, parseFloat(e.target.value) || 0),
                        ),
                      )
                    }
                    className="w-full bg-transparent font-black text-slate-800 focus:outline-none text-right"
                  />
                  <span className="font-bold text-slate-400">%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Bawah */}
        <div className="flex items-center justify-between bg-white p-4 px-6 rounded-3xl border border-slate-100 shadow-xs">
          {isSaved ? (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <CheckCircle size={16} />
              Perubahan Berhasil Disimpan!
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">
              Sinkronisasi data otomatis aktif ke tabel settings.
            </span>
          )}

          <button
            type="submit"
            className="p-3 px-6 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Save size={16} />
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
