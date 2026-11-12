import React, { useState } from "react";
import {
  Store,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { StoreSettings, User } from "../types";

interface LoginProps {
  storeSettings?: StoreSettings;
  onLoginSuccess: (user: User) => void;
}

export default function Login({ storeSettings, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const inputEmail = email.trim().toLowerCase();

    if (!inputEmail || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: inputEmail,
          password: password,
        });

      if (authError) {
        if (
          authError.message.includes("Invalid login credentials") ||
          authError.status === 400
        ) {
          throw new Error("Email atau password yang Anda masukkan salah.");
        }
        throw new Error(authError.message || "Gagal masuk ke sistem.");
      }

      if (authData?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authData.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn(
            "Peringatan saat mengambil profil:",
            profileError.message,
          );
        }

        if (profile && profile.active === false) {
          await supabase.auth.signOut();
          throw new Error(
            "Akun Anda telah dinonaktifkan. Silakan hubungi Admin.",
          );
        }

        const loggedUser: User = {
          id: profile?.id || authData.user.id,
          username:
            profile?.username ||
            authData.user.user_metadata?.username ||
            inputEmail.split("@")[0],
          name:
            profile?.name ||
            authData.user.user_metadata?.name ||
            "Kasir / Staff",
          role: profile?.role || authData.user.user_metadata?.role || "cashier",
          active: profile?.active ?? true,
          createdAt: profile?.created_at || authData.user.created_at,
        };

        onLoginSuccess(loggedUser);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat masuk ke sistem.");
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = storeSettings?.storeLogo || storeSettings?.store_logo;

  return (
    <div className="h-screen w-screen bg-slate-50/60 flex items-center justify-center p-4 font-sans select-none">
      {/* Container Card Minimalis Bersih */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm w-full max-w-sm border border-slate-100 relative z-10">
        {/* Header Toko / Logo Dinamis dari Setting */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-3 shadow-xs border border-orange-100/50 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Toko"
                className="w-full h-full object-cover"
              />
            ) : (
              <Store size={22} className="text-orange-500" />
            )}
          </div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
            {storeSettings?.name || "iKasirPRO"}
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Profesional Cashier
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-500" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 ml-1">
              Email
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
                size={15}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 ml-1">
              Password
            </label>
            <div className="relative group">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
                size={15}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold rounded-2xl text-xs transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk</span>
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </>
            )}
          </button>
        </form>

        {/* Divider Simpel */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
              Atau
            </span>
          </div>
        </div>

        {/* Tombol Hubungi Developer */}
        <a
          href="https://wa.me/6285858581509?text=Halo%20Developer,%20saya%20ingin%20registrasi%20akun%20untuk%20aplikasi%20KasirPRO."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/60 text-slate-600 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <MessageSquare size={14} className="text-emerald-500" />
          <span>Hubungi Developer</span>
        </a>
      </div>
    </div>
  );
}
