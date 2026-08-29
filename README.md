# Aplikasi Magang BPJS Ketenagakerjaan — Portal Kehadiran & Pengumpulan Tugas

Rebuild modern (Vite + React + TypeScript + Supabase) dari aplikasi magang berbasis
Google Apps Script + Spreadsheet + Drive. Terdiri dari:

- **Portal Peserta** (mobile-first): absensi, seminar, viralisasi TikTok, laporan, akuisisi BPU/PU, dan download materi.
- **Portal Admin** (desktop-first): dashboard, kelola peserta, validasi semua kiriman, dan **export Excel** (`.xlsx`).

Backend sepenuhnya di **Supabase** (PostgreSQL + Auth + Storage). Tidak ada server Node sendiri — validasi sisi server
dilakukan lewat **RLS**, **constraint DB**, dan **waktu WIB** yang dihitung di browser.

---

## Arsitektur / Stack

| Bagian | Teknologi |
| --- | --- |
| Frontend | Vite + React 18 + TypeScript |
| Router | react-router-dom |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Export Excel | ExcelJS + file-saver |
| Tema | BPJS biru (light only) |

### Alur autentikasi

- **Peserta**: tanpa login. Identitas dipilih via **pencarian NIM** (readonly, auto-fill nama). NIM/fakultas/prodi/kelompok
  diambil dari tabel `participants` (diseed dari spreadsheet lama).
- **Admin**: login email/password Supabase Auth, hanya untuk email yang terdaftar di `admin_roles`. RLS
  (`is_admin()`) memblokir akses data sensitif bagi user auth yang bukan admin.

> **Kunci rahasia**: Frontend hanya memakai `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
> Service role key **tidak pernah** ada di frontend.

---

## Struktur Folder

```
src/
  lib/            supabaseClient.ts
  types/          index.ts (domain types), database.ts (tipe tabel)
  utils/          constants.ts (window absen, validasi, WIB, masking NIK),
                  excel.ts (export .xlsx)
  services/       participantService.ts, adminService.ts
  hooks/          useAuth.ts, useParticipantSearch.ts, useGeolocation.ts
  components/     ui/*, participant/*, admin/*
  layouts/        ParticipantLayout.tsx, AdminLayout.tsx
  pages/
    participant/  Home, Absensi, Seminar, Viralisasi, Laporan, AkuisisiBPU, AkuisisiPU, Materi
    admin/        Login, Dashboard, Peserta, AdminAbsensi, AdminSeminar,
                  AdminViralisasi, AdminLaporan, AdminBPU, AdminPU, AdminMateri, ExportData
supabase/
  migrations/     0001_initial_schema.sql, 0002_materials_and_functions.sql
  seed/           participants.sql (15 contoh), admin_how_to.sql
public/materials/ BPU.pdf, PU.pdf (file materi yang disajikan peserta)
```

---

## Setup Supabase (sekali saja)

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Buka **SQL Editor**, jalankan file migrasi **secara urut**:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_materials_and_functions.sql`
   (Ini membuat tabel, fungsi `is_admin()`, **RLS**, bucket storage, view, dan seed materi.)
3. **(Opsional) Seed peserta contoh**: jalankan `supabase/seed/participants.sql`
   untuk 15 peserta, atau isi sendiri tabel `public.participants`.

### Upload file materi (BPU.pdf / PU.pdf)

File sudah ada di `public/materials/` (disajikan statis oleh Vite). Supabase juga menyimpan metadata `materials`
(fungsi, definisi di `0001/0002`):

1. Di Dashboard Supabase → **Storage** → bucket `materials` (otomatis dibuat oleh migrasi, publik).
2. Upload `BPU.pdf` dan `PU.pdf` ke dalamnya, sesuaikan dengan `storage_path`/`filename` di tabel `materials`.

### Membuat admin

Ikuti `supabase/seed/admin_how_to.sql`:

1. **Auth → Users → Add User**, buat email+password admin (mis. `admin@bpjs-magang.test`).
2. Jalankan di SQL Editor:
   ```sql
   insert into public.admin_roles (email, role) values ('admin@bpjs-magang.test', 'superadmin');
   ```
3. Login di `/login`.

> Hanya email di `admin_roles` yang bisa membaca data sensitif; user auth lain diblokir RLS.

---

## Menjalankan Aplikasi

```bash
# 1. Install dependensi
npm install

# 2. Siapkan env
cp .env.example .env
#    isi VITE_SUPABASE_URL  = https://<project-ref>.supabase.co
#    isi VITE_SUPABASE_ANON_KEY = <anon key dari Settings -> API>

# 3. Mode pengembangan
npm run dev

# 4. Build produksi (tsc + vite build)
npm run build

# 5. Preview build
npm run preview

# Lint
npm run lint
```

---

## Panduan Manual (Business Rules)

**Absensi** (per sesi/hari, waktu WIB `Asia/Jakarta`):

- PAGI : 08:00 – 09:30
- SORE : 15:30 – 17:00
- Di luar jendela → **Ditolak**. Waktu server (`now_wib()`) otoritatif; browser hanya bantu.
- Harus memilih peserta (NIM) dan mencentang **kehadiran**; foto kehadiran opsional (validasi tipe/menit),
  upload ke bucket `attendance-photos`.
- **Duplikat diblokir** oleh unique constraint `(participant_id, tanggal, session)`.
- GPS: catat lat/lng/accuracy dari Geolocation API (tanpa tolak radius). Tangani
  `PERMISSION_DENIED` / `POSITION_UNAVAILABLE` / `TIMEOUT` dengan pesan ramah.

**Seminar**: absen ringkas (NIM + status Hadir). **Viralisasi**: NIM + tautan TikTok
(hanya host `tiktok.com`: `www.`, `vt.`, `vm.`, `m.`).

**Laporan**: PDF saja, maks **10 MB** (validasi frontend + DB), upload ke bucket `reports`.

**Akuisisi BPU / PU** (formulir):
- Hanya **Kelompok + Nama KTP + NIK (16 digit) + Jenis Kelamin** + upload formulir.
- NIK bersifat **sensitif → dimasking** secara default di tampilan.
- Boleh kosong (bilangan harus 16 digit jika diisi) — ikuti aturan formulir legacy.
- File di-upload ke bucket `bpu` / `pu`.

**Materi**: bucket `materials` publik; `BPU.pdf` & `PU.pdf` bisa diunduh peserta.

---

## Testing Checklist

- [ ] `npm install`, `npm run dev`, buka `http://localhost:5173` — halaman utama muncul.
- [ ] Pilih NIM peserta → nama/fakultas/prodi/kelompok terisi otomatis (readonly).
- [ ] Absen PAGI dalam 08:00–09:30 → Hadir; di luar → Ditolak; duplikat → tolak.
- [ ] GPS: izinkan → catat lokasi; tolak → pesan error ramah (tetap bisa lanjut).
- [ ] Buat admin via `admin_roles`, login di `/login` → bisa akses semua menu.
- [ ] Export Excel dari admin (peserta, absensi, seminar, viralisasi, laporan, BPU, PU) → file `.xlsx` terunduh.
- [ ] NIK tampil termasking (mis. `123********4567`), hanya admin (role) dapat melihat penuh.
- [ ] Upload materi BPU.pdf/PU.pdf ke bucket `materials` → peserta bisa buka/download.
- [ ] `npm run lint` & `npm run build` tanpa error.

---

## Catatan

- Bundle besar karena ExcelJS — untuk produksi bisa di-code-split (dynamic import) pada halaman export bila perlu.
- File migrasi menyertakan **seed peserta contoh** dan **langkah admin**; sesuaikan email admin sesuai kebutuhan sebelum produksi.
