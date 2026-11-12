# GEMINI.md — Panduan Memahami dan Mengembangkan iKasirPRO

Dokumen ini adalah konteks utama bagi Gemini/AI coding assistant saat membaca, menjelaskan, memperbaiki, atau mengembangkan repository **iKasirPRO**. Baca dokumen ini dan file sumber terkait sebelum mengubah kode. Anggap implementasi aktual di source code sebagai sumber kebenaran jika ada perbedaan dengan dokumentasi ini.

## 1. Ringkasan proyek

**iKasirPRO** adalah aplikasi Point of Sale (POS) berbasis web untuk operasional toko. Aplikasi mencakup proses kasir/checkout, katalog produk, stok dan varian, kategori, promo/diskon, riwayat transaksi, dashboard, pengaturan toko, serta manajemen pengguna berbasis role.

Karakteristik utama:

- Frontend single-page application (SPA).
- Data utama disimpan di Supabase (PostgreSQL dan Supabase Auth).
- Sebagian data juga di-cache ke `localStorage` agar state awal dapat dipulihkan saat aplikasi dimuat.
- Sinkronisasi perubahan data menggunakan Supabase Realtime.
- Antarmuka menggunakan Bahasa Indonesia.
- Deploy frontend dikonfigurasi untuk Vercel.

Jangan mengasumsikan aplikasi sudah sepenuhnya offline-first. Source saat ini memeriksa status jaringan dan menampilkan layar “Koneksi Terputus” ketika offline.

## 2. Teknologi dan dependency

- **React 19** — UI dan state aplikasi.
- **TypeScript** — tipe data.
- **Vite 6** — development server dan build.
- **Supabase JS** — database, autentikasi, storage, dan realtime.
- **Tailwind CSS 4** dengan plugin Vite — styling.
- **Framer Motion** melalui package `motion` — animasi.
- **Lucide React** — ikon.
- **Recharts** — visualisasi/chart (jika digunakan oleh komponen).
- **xlsx** — ekspor data spreadsheet.
- **html-to-image** — konversi tampilan struk menjadi gambar.
- **Google GenAI SDK** tersedia sebagai dependency; jangan menganggap fitur AI tertentu aktif tanpa memeriksa pemakaiannya di source.

Perintah project:

```bash
npm install
npm run dev       # jalankan development server Vite
```

## 3. Struktur repository

```text
/
├── index.html                 # HTML entry untuk SPA
├── package.json               # dependency dan npm scripts
├── package-lock.json          # lockfile dependency
├── README.md                  # dokumentasi pengantar proyek
├── tsconfig.json              # konfigurasi TypeScript
├── vite.config.ts             # konfigurasi Vite, React, Tailwind, alias
├── vercel.json                # rewrite SPA ke index.html
├── src/
│   ├── main.tsx               # bootstrap React dan render App
│   ├── App.tsx                # root aplikasi, state global, auth, data, navigasi
│   ├── index.css              # stylesheet global
│   ├── types.ts               # tipe domain dan data awal
│   ├── vite-env.d.ts          # deklarasi environment Vite
│   ├── lib/
│   │   ├── supabaseClient.ts  # inisialisasi Supabase client
│   │   └── userService.ts     # operasi data user
│   └── components/
│       ├── Login.tsx
│       ├── CashierTab.tsx
│       ├── Dashboard.tsx
│       ├── InventoryManager.tsx
│       ├── CategoryManager.tsx
│       ├── PromoManager.tsx
│       ├── TransactionHistory.tsx
│       ├── ThermalReceipt.tsx
│       ├── SettingsTab.tsx
│       ├── UserManager.tsx
│       └── VariantSelectorModal.tsx
├── supabase/
│   └── SQL                   # schema, policy, trigger, RPC dan seed SQL
└── public/
    ├── icon.svg
    ├── image.png              # gambar preview/dokumentasi
    ├── manifest.json          # metadata PWA
    ├── qris.png                # aset QRIS
    └── sw.js                   # service worker
```

## 4. Tanggung jawab file dan komponen

### `src/main.tsx`

Entry point React. Periksa file ini jika perlu memahami pemasangan root React, import CSS global, atau konfigurasi awal aplikasi.

### `src/App.tsx`

Pusat orkestrasi aplikasi. Tanggung jawab utamanya:

- Menyimpan state global produk, kategori, promo, transaksi, user, user aktif, pengaturan toko, tab aktif, dan status jaringan.
- Memulihkan beberapa state dari `localStorage`.
- Memeriksa sesi Supabase Auth dan menyelaraskan profil dari tabel `users`.
- Mengambil data dari tabel Supabase saat inisialisasi.
- Berlangganan event Supabase Realtime untuk tabel-tabel utama.
- Mengatur navigasi dan visibilitas menu berdasarkan role.
- Menangani logout, notifikasi, checkout selesai, dan pemilihan struk untuk dicetak.
- Merender komponen halaman sesuai tab yang aktif.

Navigasi yang didefinisikan di `App.tsx`:
| Menu | Komponen utama | Role yang diizinkan pada konfigurasi navigasi |
|---|---|---|
| Dashboard | `Dashboard` | owner, admin |
| Kasir | `CashierTab` | owner, cashier |
| Transaksi/riwayat | `TransactionHistory` | owner, admin, cashier |
| Kategori | `CategoryManager` | owner, admin |
| Stok | `InventoryManager` | owner, admin |
| Diskon/promo | `PromoManager` | owner, admin |
| User | `UserManager` | owner |
| Pengaturan | `SettingsTab` | owner, admin |

Catatan: pembatasan menu di frontend bukan pengganti otorisasi database. Setiap operasi sensitif wajib diamankan di Supabase (RLS/RPC) dan tidak boleh hanya mengandalkan penyembunyian menu.

### Komponen dalam `src/components/`

- **`Login.tsx`** — UI login dan proses autentikasi. Periksa implementasi aktual untuk detail validasi dan pemetaan user.
- **`CashierTab.tsx`** — antarmuka POS: pencarian/pemilihan produk, keranjang, jumlah, diskon/promo, metode pembayaran, dan proses checkout. File ini berukuran besar; telusuri fungsi yang relevan sebelum mengubah alur transaksi.
- **`VariantSelectorModal.tsx`** — modal pemilihan varian produk dan atribut varian.
- **`Dashboard.tsx`** — ringkasan dan analisis penjualan/statistik; dependency `xlsx` digunakan untuk kebutuhan spreadsheet pada bagian dashboard.
- **`InventoryManager.tsx`** — pengelolaan produk, stok, harga/modal, gambar, dan produk dengan varian. Periksa semua operasi CRUD dan pemetaan kolom database sebelum mengubah skema produk.
- **`CategoryManager.tsx`** — pengelolaan kategori produk.
- **`PromoManager.tsx`** — pengelolaan kode promo/diskon, nilai, periode aktif, dan status promo.
- **`TransactionHistory.tsx`** — daftar/riwayat transaksi dan interaksi terkait transaksi.
- **`ThermalReceipt.tsx`** — tampilan struk thermal dan fungsi output/cetak/gambar. Komponen ini menerima data transaksi dan pengaturan toko; cek props aktual sebelum menggunakannya.
- **`SettingsTab.tsx`** — pengaturan informasi toko dan pajak serta konfigurasi terkait.
- **`UserManager.tsx`** — manajemen akun/personel dan role pengguna.

Jangan menebak props, nama callback, atau kontrak komponen. Buka definisi komponen dan pemanggilnya di `App.tsx` sebelum melakukan refactor.

## 5. Tipe domain (`src/types.ts`)

Tipe penting yang tersedia:

- `Product`: produk dengan SKU, nama, kategori, harga jual, harga modal, stok, batas minimum stok, gambar, dan opsi varian.
- `ProductVariant`: varian produk, atribut seperti ukuran/warna, harga, harga modal, stok, dan batas minimum.
- `TransactionItem`: item dalam transaksi, termasuk product/variant ID, SKU, nama, harga, harga modal, kuantitas, diskon nominal, dan total.
- `Transaction`: nomor invoice, tanggal ISO, daftar item, subtotal, total diskon, pajak, total akhir, metode pembayaran, uang tunai/kembalian, dan identitas kasir.
- `User`: identitas, username, nama, role, status aktif, avatar, dan waktu dibuat.
- `UserRole`: `"owner" | "admin" | "cashier"`.
- `StoreSettings`: nama/alamat/telepon toko dan pengaturan pajak.
- `Category`, `SyncConfig`, dan `ActiveTab`.

Metode pembayaran yang didefinisikan pada `Transaction`:
`cash`, `qris`, `gopay`, `ovo`, `dana`, `shopeepay`.

Ada beberapa variasi penamaan camelCase di TypeScript dan snake_case di PostgreSQL. Selalu lakukan mapping secara eksplisit; jangan mengganti nama kolom database hanya karena nama properti TypeScript berbeda.

## 6. Supabase dan model data

### Koneksi

`src/lib/supabaseClient.ts` membuat client dari environment variable:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Kedua variabel wajib tersedia. Jangan menaruh Supabase `service_role` key atau secret backend di frontend, repository, maupun file `.env` yang di-commit. `anon` key memang digunakan pada client, tetapi keamanan akses tetap harus ditentukan oleh RLS.

### Tabel yang didefinisikan di `supabase/SQL`

| Tabel              | Kegunaan                                                         |
| ------------------ | ---------------------------------------------------------------- |
| `categories`       | Kategori produk                                                  |
| `items`            | Data produk utama                                                |
| `product_variants` | Varian dan stok per varian; memiliki relasi ke `items`           |
| `promos`           | Kode promo, jenis/nilai diskon, periode, status aktif            |
| `settings`         | Informasi toko dan pengaturan pajak                              |
| `store_settings`   | Pengaturan dinamis berbentuk key-value                           |
| `transactions`     | Header transaksi dan `items_json`                                |
| `users`            | Profil aplikasi yang terhubung ke `auth.users` melalui `auth_id` |

Storage bucket:

- `avatars` — bucket untuk avatar pengguna.

### Hubungan dan alur data

- `product_variants.product_id` mengacu ke `items.id` dengan `ON DELETE CASCADE`.
- Profil aplikasi pada `public.users` terhubung ke akun Supabase Auth melalui `auth_id`.
- Trigger `on_auth_user_created` menjalankan `handle_new_user()` untuk membuat/memperbarui profil aplikasi setelah user Auth dibuat.
- `transactions.items_json` menyimpan rincian item transaksi dalam JSONB.
- `App.tsx` mengambil produk dan varian secara terpisah lalu menggabungkannya menjadi model `Product` untuk UI.
- Jika produk memiliki varian, stok tampilan produk induk dihitung dari penjumlahan stok semua varian.
- `App.tsx` memasang subscription Realtime untuk `items`, `product_variants`, `categories`, `promos`, `transactions`, `users`, `settings`, dan `store_settings`.

### RPC database

SQL mendefinisikan:

- `process_checkout(...)` — memproses checkout secara transaksional di database: mengunci baris stok, memvalidasi stok, mengurangi stok produk/varian, lalu menyimpan transaksi.
- `admin_reset_user_password(...)` — reset password user dengan pemeriksaan role admin/owner.

Penting: jangan menganggap sebuah RPC sudah dipakai oleh frontend hanya karena fungsi itu tersedia di SQL. Telusuri pemanggilnya. Jika mengubah proses checkout, pastikan alur frontend benar-benar memakai mekanisme atomik yang sesuai dan hindari pengurangan stok ganda.

## 7. Autentikasi dan role

Role aplikasi:

- `owner`
- `admin`
- `cashier`

`App.tsx` memeriksa sesi Supabase Auth, kemudian mencari profil di `public.users` berdasarkan `auth_id`. Role menentukan tab awal dan menu yang ditampilkan.

`userService.ts` menyediakan operasi:

- `getUsers()` — mengambil daftar user.
- `createUser()` — membuat akun melalui Supabase Auth dan menyimpan profil ke tabel `users`.
- `deleteUser()` — menghapus profil berdasarkan ID.

Periksa trigger `handle_new_user()` ketika mengubah pembuatan user: trigger dan insert manual dari client dapat saling berinteraksi. Pastikan tidak terjadi duplikasi profil. Jangan pernah menyimpan password plaintext ke tabel profil atau localStorage.

## 8. Cache lokal, realtime, dan konsistensi data

`App.tsx` menggunakan beberapa key localStorage, antara lain:

- `kp_products`
- `kp_categories`
- `kp_promos`
- `kp_transactions`
- `kb_store_settings`
- `kp_users` (digunakan pada bagian pengelolaan user tertentu)

Saat startup, aplikasi memulihkan cache lalu mengambil data cloud. Perubahan pada tabel yang di-subscribe memicu fetch ulang.

Pedoman:

1. Tentukan sumber kebenaran data sebelum mengubah sinkronisasi.
2. Jaga agar data hasil mapping Supabase konsisten dengan tipe TypeScript.
3. Tangani error Supabase dan kondisi data kosong secara eksplisit.
4. Hindari menimpa data terbaru dengan cache yang sudah usang.
5. Pertimbangkan efek event Realtime terhadap operasi yang baru saja dilakukan.
6. Jangan menyatakan aplikasi mendukung transaksi offline penuh tanpa membangun antrean sinkronisasi dan rekonsiliasi yang benar.

## 9. UI dan gaya desain

- Gunakan Bahasa Indonesia untuk teks antarmuka yang sudah berbahasa Indonesia.
- Pertahankan identitas visual yang sudah ada: dominasi warna orange sebagai aksen, latar netral/slate, komponen rounded, dan tampilan POS yang ringkas.
- Gunakan Tailwind utility class yang konsisten dengan versi Tailwind yang terpasang.
- Gunakan ikon `lucide-react`.
- Gunakan `motion`/Framer Motion hanya jika sesuai pola yang sudah ada.
- Pertahankan responsivitas desktop dan mobile; `App.tsx` memiliki sidebar desktop dan drawer mobile.
- Hindari mengubah layout besar-besaran jika permintaan hanya menyangkut bug atau satu fitur kecil.

## 10. Deployment dan konfigurasi

`vite.config.ts`:

- Mengaktifkan plugin React dan Tailwind Vite.
- Alias `@` diarahkan ke root repository (`.`), bukan otomatis ke `src`.
- Memiliki pengaturan HMR/file watch melalui `DISABLE_HMR`.

`vercel.json`:

- Semua path diarahkan ke `/index.html` agar routing SPA dapat di-handle frontend.

Build produksi:

```bash
npm run build
```

Output Vite berada di `dist/`. Project ini dikonfigurasi sebagai frontend SPA; jangan mengasumsikan ada backend Express yang berjalan hanya karena `express` tercantum di dependencies. Jangan menambahkan konfigurasi server/API baru tanpa kebutuhan dan desain yang jelas.

## 11. Aturan kerja untuk AI coding assistant

Saat menerima permintaan perubahan:

1. **Pahami konteks sebelum mengedit.** Baca file yang relevan, pemanggil komponen, tipe data, dan SQL terkait.
2. **Telusuri alur end-to-end.** Untuk fitur data, periksa UI → state/callback → Supabase query/RPC → schema/RLS → realtime/cache.
3. **Jangan menebak struktur.** Cari definisi fungsi, props, tipe, nama tabel/kolom, dan pemanggil aktual.
4. **Perubahan sekecil mungkin.** Hindari refactor tidak terkait, penggantian library, atau perubahan desain yang tidak diminta.
5. **Jaga kompatibilitas.** Pertahankan kontrak komponen, bentuk data transaksi lama, dan pemetaan snake_case/camelCase kecuali migrasi memang diperlukan.
6. **Keamanan utama.** Jangan mengekspos secret, jangan menaruh password plaintext, dan jangan mengandalkan role UI sebagai satu-satunya kontrol akses.
7. **Perhatikan transaksi dan stok.** Checkout harus mencegah stok negatif, race condition, transaksi ganda, dan pengurangan stok ganda.
8. **Database migration.** Jika perubahan membutuhkan kolom/tabel/RPC/policy baru, sertakan SQL migration yang jelas dan aman untuk dijalankan. Jangan menganggap perubahan TypeScript otomatis mengubah database.
9. **Jangan menghapus data atau mengubah schema destruktif** tanpa menjelaskan dampak dan meminta persetujuan bila berisiko.
10. **Verifikasi.** Jalankan atau sarankan `npm run lint` dan `npm run build`; perbaiki error yang disebabkan perubahan.
11. **Laporkan hasil.** Sebutkan file yang diubah, ringkasan perilaku, perubahan SQL/env bila ada, serta hasil verifikasi dan hal yang masih perlu dilakukan manual.

## 12. Hal yang perlu diperiksa dengan hati-hati

- **Checkout:** SQL menyediakan RPC `process_checkout`, tetapi pastikan apakah komponen kasir benar-benar memanggilnya. Jangan membuat jalur checkout kedua yang mengurangi stok lagi.
- **Stok varian:** stok produk induk merupakan agregasi stok varian pada proses fetch. Operasi stok varian harus memperbarui baris varian, bukan hanya stok induk.
- **User creation:** `userService.createUser()` melakukan sign-up Auth dan insert profil, sementara SQL juga memiliki trigger pembuatan profil. Periksa potensi konflik/duplikasi sebelum mengubahnya.
- **RLS:** SQL saat ini memiliki policy baca publik untuk beberapa tabel dan policy `FOR ALL` bagi role `authenticated`. Evaluasi ulang keamanan berdasarkan kebutuhan bisnis; jangan memperluas akses tanpa alasan.
- **Promo:** tabel `promos` memiliki tipe/nilai/minimum pembelian/maksimum diskon/periode/status. Validasi tanggal dan perhitungan diskon harus konsisten di UI dan saat checkout.
- **Pajak:** terdapat beberapa variasi nama properti/kolom (`isTaxEnabled`, `is_tax_enabled`, `istaxenabled`, dan variasi persentase). Periksa mapping aktual sebelum mengubah.
- **localStorage:** key lama dapat berisi bentuk data berbeda. Pertimbangkan kompatibilitas saat mengubah model data.
- **PWA/service worker:** `manifest.json` dan `sw.js` tersedia. Periksa implementasinya sebelum mengubah caching atau strategi deployment.

## 13. Cara menjawab pemilik proyek

Gunakan Bahasa Indonesia kecuali diminta lain. Berikan instruksi yang praktis dan spesifik terhadap file/fungsi yang benar-benar ada. Jika ada beberapa pendekatan, rekomendasikan yang paling aman dan jelaskan trade-off singkat. Jangan mengklaim telah menjalankan build, tes, query database, atau deployment jika tindakan tersebut belum benar-benar dilakukan.

**Prinsip utama:** pahami arsitektur yang sudah ada, jaga alur kasir dan integritas stok/transaksi, amankan akses data di Supabase, lalu lakukan perubahan minimal yang dapat diverifikasi.
