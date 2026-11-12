import React, { useState, useEffect } from "react";
import { User } from "../types";
import { supabase } from "../lib/supabaseClient";
import {
  Shield,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit,
  Upload,
  Camera,
  Users,
} from "lucide-react";

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State Modal Detail / Edit Akun
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form State (Avatar & Role)
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formRole, setFormRole] = useState<string>("cashier");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const fetchUsers = async () => {
    if (!supabase) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        const parsedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          authId: u.auth_id,
          username: u.username || u.email || "user",
          name: u.name || u.username || "Staff",
          role: u.role || "cashier",
          active: u.active ?? true,
          avatarUrl: u.avatar_url || "",
          createdAt: u.created_at,
        }));
        setUsers(parsedUsers);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data user:", err.message);
      showNotification("error", "Gagal memuat data pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    if (!supabase) return;
    const channel = supabase
      .channel("realtime_users_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchUsers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotification(
        "error",
        "Harap pilih file gambar yang valid (JPG/PNG/WebP).",
      );
      return;
    }

    try {
      setUploadingImage(true);
      const fileExt = file.name.split(".").pop();
      const randomString = Math.random().toString(36).substring(2, 9);
      const fileName = `${Date.now()}_${randomString}.${fileExt}`;
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
        setFormAvatarUrl(publicURLData.publicUrl);
        showNotification("success", "Foto profil berhasil diunggah!");
      }
    } catch (err: any) {
      console.error("Gagal mengunggah gambar:", err.message);
      showNotification(
        "error",
        err.message ||
          "Gagal mengunggah foto. Pastikan bucket 'avatars' sudah aktif di Supabase.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenEditModal = (user: any) => {
    setSelectedUser(user);
    setFormAvatarUrl(user.avatarUrl || "");
    setFormRole(user.role || "cashier");
    setIsModalOpen(true);
  };

  const handleSaveAccountChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedUser) return;
    setFormSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          avatar_url: formAvatarUrl.trim() || null,
          role: formRole,
        })
        .eq("id", selectedUser.id);

      if (updateError) throw updateError;

      showNotification("success", "Informasi akun berhasil diperbarui!");
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Error updating account:", err);
      showNotification(
        "error",
        err.message || "Gagal memperbarui informasi akun.",
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/40 p-0 space-y-4 font-sans">
      {/* Notifikasi */}
      {notification.show && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium ${
              notification.type === "success"
                ? "bg-slate-900 border-slate-800 text-white"
                : "bg-rose-600 border-rose-500 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={16} className="text-orange-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-white shrink-0" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() =>
                setNotification((prev) => ({ ...prev, show: false }))
              }
              className="ml-2 p-1 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tabel Pengguna dalam Card Membulat */}
      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Pengguna</th>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Role / Akses</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2
                        size={16}
                        className="animate-spin text-orange-500"
                      />
                      <span className="text-xs font-bold">
                        Memuat data pengguna...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-orange-50 text-orange-400 rounded-2xl">
                        <Users size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        Belum Ada Pengguna
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Belum ada data akun yang terdaftar.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user: any) => {
                  const isSelf = currentUser?.id === user.id;
                  const displayName = user.name || user.username || "User";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={displayName}
                              className="w-9 h-9 rounded-2xl object-cover shrink-0 border border-slate-200/60"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center uppercase text-xs shrink-0 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors border border-slate-200/60">
                              {displayName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-2">
                              <span>{displayName}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-xl font-black">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {user.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-slate-500 text-xs">
                        {user.username}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            user.active !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          {user.active !== false ? "Aktif" : "Non-aktif"}
                        </span>
                      </td>

                      {/* KOLOM ROLE / AKSES (TERPISAH) */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-wide ${
                            user.role === "owner"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : user.role === "admin"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          <Shield size={11} className="opacity-70" />
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </td>

                      {/* KOLOM TOMBOL AKSI (TERPISAH DI KOLOM KHUSUS) */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                          title="Detail & Ubah Akun"
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL AKUN & EDIT (AVATAR & ROLE) */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Kelola & Edit Akun
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveAccountChanges}
              className="py-4 space-y-4"
            >
              {/* Ubah / Upload Foto Profil */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Foto Profil
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {formAvatarUrl ? (
                      <img
                        src={formAvatarUrl}
                        alt="Preview"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold border-2 border-slate-200">
                        Foto
                      </div>
                    )}
                    <label
                      htmlFor="avatar-upload-input"
                      className="absolute -bottom-1 -right-1 p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
                      title="Ganti Foto Profil"
                    >
                      <Camera size={12} />
                    </label>
                  </div>

                  <div className="flex-1">
                    <label
                      htmlFor="avatar-upload-input"
                      className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin text-orange-500"
                          />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} className="text-orange-500" />
                          <span>Pilih Gambar Perangkat</span>
                        </>
                      )}
                    </label>
                    <input
                      id="avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* INFORMASI AKUN (READ-ONLY) */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.username || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Tanggal Dibuat
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString(
                          "id-ID",
                          {
                            dateStyle: "medium",
                          },
                        )
                      : "-"
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 cursor-not-allowed select-none"
                />
              </div>

              {/* PENGATURAN ROLE AKSES */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Ubah Role Akses
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 uppercase tracking-wide cursor-pointer"
                >
                  <option value="owner">OWNER</option>
                  <option value="admin">ADMIN</option>
                  <option value="cashier">CASHIER</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Mengubah role akan menyesuaikan hak akses pengguna secara
                  real-time pada sistem.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || uploadingImage}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
