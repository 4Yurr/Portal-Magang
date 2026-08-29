-- ============================================================================
-- APLIKASI MAGANG BPJS KETENAGAKERJAAN
-- Migration: 0001_initial_schema.sql
-- Skema database, constraints, RLS, dan storage.
-- Jalankan di Supabase SQL Editor (atau supabase db push).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extended types
-- ----------------------------------------------------------------------------
create type public.attendance_session as enum ('PAGI', 'SORE');
create type public.gender as enum ('Laki-laki', 'Perempuan');
create type public.submission_status as enum ('Hadir', 'Ditolak');

-- ----------------------------------------------------------------------------
-- Table: admin_roles
-- Mapping email -> role admin. Dipakai oleh fungsi RLS `is_admin`.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Table: participants (master peserta - sumber resmi identitas)
-- ----------------------------------------------------------------------------
create table if not exists public.participants (
  nim text primary key,
  nama text not null,
  fakultas text not null default '',
  prodi text not null default '',
  kelompok text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Table: attendance (absensi biasa; immutable log + unique anti-duplicate)
-- ----------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null references public.participants(nim) on delete restrict,
  tanggal date not null,
  session public.attendance_session not null,
  jam time not null,
  status public.submission_status not null default 'Hadir',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy numeric,
  photo_path text,
  photo_filename text,
  created_at timestamptz not null default now(),
  -- Anti-duplicate: satu peserta hanya boleh satu absen per tanggal+sesi
  constraint uq_attendance_participant_day_session unique (participant_id, tanggal, session)
);

create index if not exists idx_attendance_date_session on public.attendance (tanggal, session);
create index if not exists idx_attendance_participant on public.attendance (participant_id);

-- ----------------------------------------------------------------------------
-- Table: seminar_attendance (presensi seminar/webinar)
-- ----------------------------------------------------------------------------
create table if not exists public.seminar_attendance (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null references public.participants(nim) on delete restrict,
  kegiatan text not null,
  tanggal date not null,
  jam time not null,
  status public.submission_status not null default 'Hadir',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy numeric,
  photo_path text,
  photo_filename text,
  created_at timestamptz not null default now(),
  -- Anti-duplicate: satu peserta + kegiatan + tanggal
  constraint uq_seminar_participant_activity_day unique (participant_id, kegiatan, tanggal)
);

create index if not exists idx_seminar_tanggal on public.seminar_attendance (tanggal);
create index if not exists idx_seminar_participant on public.seminar_attendance (participant_id);

-- ----------------------------------------------------------------------------
-- Table: tiktok_submissions (video viralisasi per kelompok)
-- ----------------------------------------------------------------------------
create table if not exists public.tiktok_submissions (
  id uuid primary key default gen_random_uuid(),
  kelompok text not null,
  pengirim text not null,
  url text not null,
  note text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_tiktok_kelompok on public.tiktok_submissions (kelompok);

-- ----------------------------------------------------------------------------
-- Table: reports (upload laporan akhir - HANYA PDF, maks 10MB)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null references public.participants(nim) on delete restrict,
  judul text not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_participant on public.reports (participant_id);

-- ----------------------------------------------------------------------------
-- Table: akuisisi_bpu (Bukan Penerima Upah) - NIK SENSITIF
-- ----------------------------------------------------------------------------
create table if not exists public.akuisisi_bpu (
  id uuid primary key default gen_random_uuid(),
  kelompok text not null,
  nama_ktp text not null,
  nik text not null,
  jenis_kelamin public.gender not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_bpu_kelompok on public.akuisisi_bpu (kelompok);

-- ----------------------------------------------------------------------------
-- Table: akuisisi_pu (Penerima Upah) - NIK SENSITIF
-- ----------------------------------------------------------------------------
create table if not exists public.akuisisi_pu (
  id uuid primary key default gen_random_uuid(),
  kelompok text not null,
  nama_ktp text not null,
  nik text not null,
  jenis_kelamin public.gender not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pu_kelompok on public.akuisisi_pu (kelompok);

-- ----------------------------------------------------------------------------
-- Fungsi helper updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_participants_updated on public.participants;
create trigger trg_participants_updated
  before update on public.participants
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Fungsi RLS: is_admin()
-- Memvalidasi apakah user yang sedang login adalah admin (divalidasi di DB).
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.admin_roles ar
    join auth.users u on u.email = ar.email
    where u.id = auth.uid()
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.admin_roles enable row level security;
alter table public.participants enable row level security;
alter table public.attendance enable row level security;
alter table public.seminar_attendance enable row level security;
alter table public.tiktok_submissions enable row level security;
alter table public.reports enable row level security;
alter table public.akuisisi_bpu enable row level security;
alter table public.akuisisi_pu enable row level security;

-- ----------------------------------------------------------------------------
-- admin_roles: hanya bisa dibaca dalam fungsi RLS internal; tidak exposed
-- ----------------------------------------------------------------------------
drop policy if exists "admin_roles_select_if_admin" on public.admin_roles;
create policy "admin_roles_select_if_admin" on public.admin_roles
  for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- participants:
--   - SELECT publik (untuk pencarian NIM & nama otomatis di portal peserta)
--   - INSERT/UPDATE/DELETE hanya admin
-- ----------------------------------------------------------------------------
drop policy if exists "participants_select_public" on public.participants;
create policy "participants_select_public" on public.participants
  for select using (true);

drop policy if exists "participants_insert_admin" on public.participants;
create policy "participants_insert_admin" on public.participants
  for insert with check (public.is_admin());

drop policy if exists "participants_update_admin" on public.participants;
create policy "participants_update_admin" on public.participants
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "participants_delete_admin" on public.participants;
create policy "participants_delete_admin" on public.participants
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- attendance:
--   - INSERT anonim (peserta menyerahkan absensi)
--   - SELECT/UPDATE/DELETE hanya admin
--   - Duplikat dicegah oleh unique constraint (server-side, bukan frontend)
-- ----------------------------------------------------------------------------
drop policy if exists "attendance_insert_public" on public.attendance;
create policy "attendance_insert_public" on public.attendance
  for insert with check (true);

drop policy if exists "attendance_select_admin" on public.attendance;
create policy "attendance_select_admin" on public.attendance
  for select using (public.is_admin());

drop policy if exists "attendance_update_admin" on public.attendance;
create policy "attendance_update_admin" on public.attendance
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "attendance_delete_admin" on public.attendance;
create policy "attendance_delete_admin" on public.attendance
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- seminar_attendance: pola sama seperti attendance
-- ----------------------------------------------------------------------------
drop policy if exists "seminar_insert_public" on public.seminar_attendance;
create policy "seminar_insert_public" on public.seminar_attendance
  for insert with check (true);

drop policy if exists "seminar_select_admin" on public.seminar_attendance;
create policy "seminar_select_admin" on public.seminar_attendance
  for select using (public.is_admin());

drop policy if exists "seminar_update_admin" on public.seminar_attendance;
create policy "seminar_update_admin" on public.seminar_attendance
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "seminar_delete_admin" on public.seminar_attendance;
create policy "seminar_delete_admin" on public.seminar_attendance
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- tiktok_submissions
-- ----------------------------------------------------------------------------
drop policy if exists "tiktok_insert_public" on public.tiktok_submissions;
create policy "tiktok_insert_public" on public.tiktok_submissions
  for insert with check (true);

drop policy if exists "tiktok_select_admin" on public.tiktok_submissions;
create policy "tiktok_select_admin" on public.tiktok_submissions
  for select using (public.is_admin());

drop policy if exists "tiktok_delete_admin" on public.tiktok_submissions;
create policy "tiktok_delete_admin" on public.tiktok_submissions
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------------------
drop policy if exists "reports_insert_public" on public.reports;
create policy "reports_insert_public" on public.reports
  for insert with check (true);

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin" on public.reports
  for select using (public.is_admin());

drop policy if exists "reports_delete_admin" on public.reports;
create policy "reports_delete_admin" on public.reports
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- akuisisi_bpu (NIK SENSITIF):
--   - INSERT publik (peserta mengirim)
--   - SELECT/UPDATE/DELETE HANYA admin (agar NIK tidak bocor ke publik)
-- ----------------------------------------------------------------------------
drop policy if exists "bpu_insert_public" on public.akuisisi_bpu;
create policy "bpu_insert_public" on public.akuisisi_bpu
  for insert with check (true);

drop policy if exists "bpu_select_admin" on public.akuisisi_bpu;
create policy "bpu_select_admin" on public.akuisisi_bpu
  for select using (public.is_admin());

drop policy if exists "bpu_update_admin" on public.akuisisi_bpu;
create policy "bpu_update_admin" on public.akuisisi_bpu
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bpu_delete_admin" on public.akuisisi_bpu;
create policy "bpu_delete_admin" on public.akuisisi_bpu
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- akuisisi_pu (NIK SENSITIF)
-- ----------------------------------------------------------------------------
drop policy if exists "pu_insert_public" on public.akuisisi_pu;
create policy "pu_insert_public" on public.akuisisi_pu
  for insert with check (true);

drop policy if exists "pu_select_admin" on public.akuisisi_pu;
create policy "pu_select_admin" on public.akuisisi_pu
  for select using (public.is_admin());

drop policy if exists "pu_update_admin" on public.akuisisi_pu;
create policy "pu_update_admin" on public.akuisisi_pu
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pu_delete_admin" on public.akuisisi_pu;
create policy "pu_delete_admin" on public.akuisisi_pu
  for delete using (public.is_admin());

-- ============================================================================
-- SUPABASE STORAGE
-- Buckets: attendance-photos, reports, bpu, pu, materials
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('attendance-photos', 'attendance-photos', false),
  ('reports', 'reports', false),
  ('bpu', 'bpu', false),
  ('pu', 'pu', false),
  ('materials', 'materials', true)
on conflict (id) do nothing;

-- Storage policies
-- attendance-photos: anonim boleh upload (untuk file absensi), hanya admin yang baca
drop policy if exists "attendance_photos_insert_public" on storage.objects;
create policy "attendance_photos_insert_public" on storage.objects
  for insert with check (bucket_id = 'attendance-photos');

drop policy if exists "attendance_photos_admin_read" on storage.objects;
create policy "attendance_photos_admin_read" on storage.objects
  for select using (bucket_id = 'attendance-photos' and public.is_admin());

-- reports: anonim boleh upload, admin baca
drop policy if exists "reports_insert_public" on storage.objects;
create policy "reports_insert_public" on storage.objects
  for insert with check (bucket_id = 'reports');

drop policy if exists "reports_admin_read" on storage.objects;
create policy "reports_admin_read" on storage.objects
  for select using (bucket_id = 'reports' and public.is_admin());

-- bpu: anonim boleh upload, admin baca (NIK sensitif)
drop policy if exists "bpu_insert_public" on storage.objects;
create policy "bpu_insert_public" on storage.objects
  for insert with check (bucket_id = 'bpu');

drop policy if exists "bpu_admin_read" on storage.objects;
create policy "bpu_admin_read" on storage.objects
  for select using (bucket_id = 'bpu' and public.is_admin());

-- pu: anonim boleh upload, admin baca (NIK sensitif)
drop policy if exists "pu_insert_public" on storage.objects;
create policy "pu_insert_public" on storage.objects
  for insert with check (bucket_id = 'pu');

drop policy if exists "pu_admin_read" on storage.objects;
create policy "pu_admin_read" on storage.objects
  for select using (bucket_id = 'pu' and public.is_admin());

-- materials: bucket publik (untuk download BPU.pdf / PU.pdf oleh peserta)
drop policy if exists "materials_public_read_anon" on storage.objects;
create policy "materials_public_read_anon" on storage.objects
  for select using (bucket_id = 'materials');

-- Izinkan admin upload ke materials
drop policy if exists "materials_admin_insert" on storage.objects;
create policy "materials_admin_insert" on storage.objects
  for insert with check (bucket_id = 'materials' and public.is_admin());
