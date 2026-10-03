# Aplikasi Magang BPJS Ketenagakerjaan — Portal Kehadiran & Pengumpulan Tugas

Rebuild modern (Vite + React + TypeScript + Supabase) dari aplikasi magang berbasis
Google Apps Script + Spreadsheet + Drive. Terdiri dari:

- **Portal Peserta** (mobile-first): absensi harian, seminar, pengumuman, viralisasi, laporan, dan download materi.
- **Portal Admin** (desktop-first): dashboard, kelola peserta, absensi bulanan, pengumuman, dan **export Excel** (`.xlsx`).

Backend sepenuhnya di **Supabase** (PostgreSQL + Auth + Storage). Tidak ada server Node sendiri — validasi sisi server
ditegakkan di database memakai **RLS**, **unique constraint**, dan **waktu WIB server**.

---

## Arsitektur / Stack

| Bagian | Teknologi |
| --- | --- |
| Frontend | Vite + React 18 + TypeScript |
| Router | react-router-dom |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) + Google Drive |
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
  utils/          constants.ts (jendela absensi, validasi, WIB),
                  excel.ts (export .xlsx)
  services/       participantService.ts, adminService.ts
  hooks/          useAuth.ts, useParticipantSearch.ts, useGeolocation.ts
  components/     ui/*, participant/*, admin/*
  layouts/        ParticipantLayout.tsx, AdminLayout.tsx
  pages/
    participant/  Home, Absensi, Seminar, Pengumuman, Viralisasi, Laporan, Materi
    admin/        Login, Dashboard, Peserta, AdminAbsensi, AdminRekapAbsensi,
                  AdminSeminar, AdminPengumuman, AdminViralisasi, AdminLaporan, AdminMateri, ExportData
supabase/
  migrations/     0001-0013 (schema, RLS, daily attendance, announcements)
  seed/           participants.sql (15 contoh), admin_how_to.sql
public/materials/ BPU.pdf, PU.pdf, dan brosur BPJS 2026 (file materi yang disajikan peserta)
```

---

## Setup Supabase (sekali saja)

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Buka **SQL Editor**, jalankan file migrasi **secara urut**:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_materials_and_functions.sql`
   - Jalankan migration lanjutan `0003` sampai `0013` secara berurutan.
   (Ini membuat tabel, fungsi `is_admin()`, **RLS**, bucket storage, view, dan seed materi.)
3. **(Opsional) Seed peserta contoh**: jalankan `supabase/seed/participants.sql`
   untuk 15 peserta, atau isi sendiri tabel `public.participants`.

### File materi lokal

File PDF lokal di `public/materials/` disajikan langsung oleh Vite dan otomatis muncul di halaman Materi:

- `BPU.pdf`
- `PU.pdf`
- `FA Brosur BPU_2026.pdf`
- `FA Brosur PU Mikro_2026.pdf`
- `FA Brosur PU UMB_2026.pdf`

Supabase juga menyimpan metadata `materials` untuk materi tambahan yang dikelola admin:

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

**Absensi biasa** (maksimal sekali sehari, waktu WIB `Asia/Jakarta`):

- Satu jam buka dan jam tutup diatur admin melalui menu Pengaturan.
- Di luar jendela → absensi ditolak oleh trigger database berdasarkan waktu server WIB.
- Foto dikirim melalui Supabase Edge Function ke Google Drive; database menyimpan URL Drive.
- **Duplikat diblokir** oleh unique constraint `(participant_id, tanggal)`.
- GPS: catat lat/lng/accuracy dari Geolocation API (tanpa tolak radius). Tangani
  `PERMISSION_DENIED` / `POSITION_UNAVAILABLE` / `TIMEOUT` dengan pesan ramah.

**Seminar** tetap dicatat terpisah dari absensi harian. **Viralisasi** menyimpan tautan Instagram.

**Laporan**: PDF saja, maks **10 MB**, dikirim ke Google Drive.

**Pengumuman**: admin dapat menerbitkan judul, teks, gambar, dan satu lampiran. File disimpan di Google Drive;
peserta hanya melihat pengumuman terbit dan mengunduh lampiran.

**Materi**: bucket `materials` publik; `BPU.pdf` & `PU.pdf` bisa diunduh peserta.

---

## Testing Checklist

- [ ] `npm install`, `npm run dev`, buka `http://localhost:5173` — halaman utama muncul.
- [ ] Pilih NIM peserta → nama/fakultas/prodi/kelompok terisi otomatis (readonly).
- [ ] Absen dalam jam yang dikonfigurasi → Hadir; di luar jam atau duplikat harian → ditolak.
- [ ] GPS: izinkan → catat lokasi; tolak → pesan error ramah (tetap bisa lanjut).
- [ ] Buat admin via `admin_roles`, login di `/login` → bisa akses semua menu.
- [ ] Rekap absensi admin menampilkan bulan terpilih dan status bisa diperbarui.
- [ ] Pengumuman dapat diterbitkan dengan gambar/lampiran, dan peserta dapat mengunduh lampiran.
- [ ] Export Excel dari admin (peserta, absensi, seminar, viralisasi, laporan) → file `.xlsx` terunduh.
- [ ] Upload materi BPU.pdf/PU.pdf ke bucket `materials` → peserta bisa buka/download.
- [ ] `npm run lint` & `npm run build` tanpa error.

---

## Catatan

- Bundle besar karena ExcelJS — untuk produksi bisa di-code-split (dynamic import) pada halaman export bila perlu.
- File migrasi menyertakan **seed peserta contoh** dan **langkah admin**; sesuaikan email admin sesuai kebutuhan sebelum produksi.
