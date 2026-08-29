-- ============================================================================
-- Migration: 0002_materials_and_functions.sql
-- Tabel metadata materi PDF, fungsi helper waktu server, dan view rekap.
-- ============================================================================

-- Table: materials (metadata PDF materi/formulir untuk portal peserta)
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  storage_path text not null,
  filename text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_materials_active on public.materials (is_active);

alter table public.materials enable row level security;

-- Select publik (peserta melihat daftar materi untuk download)
drop policy if exists "materials_select_public" on public.materials;
create policy "materials_select_public" on public.materials
  for select using (true);

-- Admin kelola materi
drop policy if exists "materials_insert_admin" on public.materials;
create policy "materials_insert_admin" on public.materials
  for insert with check (public.is_admin());

drop policy if exists "materials_update_admin" on public.materials;
create policy "materials_update_admin" on public.materials
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "materials_delete_admin" on public.materials;
create policy "materials_delete_admin" on public.materials
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Fungsi: waktu server saat ini dalam Asia/Jakarta
-- Dipakai untuk validasi jadwal absensi (sumber waktu = server/database).
-- ----------------------------------------------------------------------------
create or replace function public.now_wib()
returns timestamptz language sql stable as $$
  select now() at time zone 'Asia/Jakarta';
$$;

-- ----------------------------------------------------------------------------
-- Fungsi helper: apakah absensi sesi tertentu sedang dibuka (berdasarkan waktu server)
-- ----------------------------------------------------------------------------
create or replace function public.attendance_open_info()
returns table (
  session text,
  is_open boolean,
  message text
) language sql stable as $$
  select
    'PAGI'::text,
    (local_time::time between time '08:00:00' and time '09:30:00'),
    case
      when local_time::time < time '08:00:00' then 'Absensi Pagi belum dibuka (08:00 - 09:30 WIB).'
      when local_time::time > time '09:30:00' then 'Absensi Pagi sudah ditutup (08:00 - 09:30 WIB).'
      else 'Absensi Pagi Dibuka (08:00 - 09:30 WIB).'
    end
  from (select (public.now_wib())::timestamp as local_time) t
  union all
  select
    'SORE'::text,
    (local_time::time between time '15:30:00' and time '17:00:00'),
    case
      when local_time::time < time '15:30:00' then 'Absensi Sore belum dibuka (15:30 - 17:00 WIB).'
      when local_time::time > time '17:00:00' then 'Absensi Sore sudah ditutup (15:30 - 17:00 WIB).'
      else 'Absensi Sore Dibuka (15:30 - 17:00 WIB).'
    end
  from (select (public.now_wib())::timestamp as local_time) t;
$$;

-- ----------------------------------------------------------------------------
-- View: data peserta yang di-join (untuk tampilan admin yang mudah)
-- ----------------------------------------------------------------------------
create or replace view public.v_attendance as
select
  a.id,
  a.participant_id as nim,
  p.nama,
  p.fakultas,
  p.prodi,
  p.kelompok,
  a.tanggal,
  a.jam,
  a.session,
  a.status,
  a.latitude,
  a.longitude,
  a.accuracy,
  a.photo_path,
  a.photo_filename,
  a.created_at
from public.attendance a
left join public.participants p on p.nim = a.participant_id;

create or replace view public.v_seminar as
select
  s.id,
  s.participant_id as nim,
  p.nama,
  p.fakultas,
  p.prodi,
  p.kelompok,
  s.kegiatan,
  s.tanggal,
  s.jam,
  s.status,
  s.latitude,
  s.longitude,
  s.accuracy,
  s.photo_path,
  s.photo_filename,
  s.created_at
from public.seminar_attendance s
left join public.participants p on p.nim = s.participant_id;

create or replace view public.v_reports as
select
  r.id,
  r.participant_id as nim,
  p.nama,
  p.fakultas,
  p.prodi,
  p.kelompok,
  r.judul,
  r.storage_path,
  r.filename,
  r.mime_type,
  r.size_bytes,
  r.created_at
from public.reports r
left join public.participants p on p.nim = r.participant_id;

-- ----------------------------------------------------------------------------
-- Seed: materi BPU dan PU (metadata; file asli disimpan di storage bucket materials)
-- ----------------------------------------------------------------------------
insert into public.materials (slug, title, description, storage_path, filename)
values
  ('bpu', 'Formulir / Materi Acuan BPU', 'Formulir dan materi acuan pendataan Bukan Penerima Upah (BPU).', 'materials/BPU.pdf', 'BPU.pdf'),
  ('pu', 'Formulir / Materi Acuan PU', 'Formulir dan materi acuan pendataan Penerima Upah (PU).', 'materials/PU.pdf', 'PU.pdf')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  storage_path = excluded.storage_path,
  filename = excluded.filename;
