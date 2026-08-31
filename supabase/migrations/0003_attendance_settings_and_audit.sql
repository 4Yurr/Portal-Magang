-- ============================================================================
-- Migration: 0003_attendance_settings_and_audit.sql
-- Admin-configurable attendance windows and audit trail.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('Hadir', 'Izin', 'Sakit', 'Ditolak');
  end if;
end $$;

create table if not exists public.attendance_settings (
  id uuid primary key default gen_random_uuid(),
  session public.attendance_session not null unique,
  start_time time not null,
  end_time time not null,
  active_date_start date,
  active_date_end date,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  table_name text not null,
  record_id text,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_settings_active on public.attendance_settings (is_active);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

create or replace function public.set_attendance_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_attendance_settings_updated on public.attendance_settings;
create trigger trg_attendance_settings_updated
  before update on public.attendance_settings
  for each row execute function public.set_attendance_settings_updated_at();

-- Keep compatibility with older status values.
-- The old columns carry a default from the previous enum, and the status column is
-- still referenced by views, so we must drop the dependent views first to satisfy
-- Postgres before altering the enum type.
drop view if exists public.v_attendance;
drop view if exists public.v_seminar;

drop view if exists public.v_reports;

alter table public.attendance
  alter column status drop default;

alter table public.attendance
  alter column status type public.attendance_status
  using status::text::public.attendance_status;

alter table public.attendance
  alter column status set default 'Hadir';

alter table public.seminar_attendance
  alter column status drop default;

alter table public.seminar_attendance
  alter column status type public.attendance_status
  using status::text::public.attendance_status;

alter table public.seminar_attendance
  alter column status set default 'Hadir';

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

alter table public.attendance_settings enable row level security;
alter table public.audit_logs enable row level security;

-- admin can read/write settings and audit logs
 drop policy if exists "attendance_settings_select_admin" on public.attendance_settings;
create policy "attendance_settings_select_admin" on public.attendance_settings
  for select using (public.is_admin());

drop policy if exists "attendance_settings_upsert_admin" on public.attendance_settings;
create policy "attendance_settings_upsert_admin" on public.attendance_settings
  for insert with check (public.is_admin());

drop policy if exists "attendance_settings_update_admin" on public.attendance_settings;
create policy "attendance_settings_update_admin" on public.attendance_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (public.is_admin());

drop policy if exists "audit_logs_insert_admin" on public.audit_logs;
create policy "audit_logs_insert_admin" on public.audit_logs
  for insert with check (public.is_admin());

-- Seed defaults
insert into public.attendance_settings (session, start_time, end_time, active_date_start, active_date_end, is_active)
values
  ('PAGI', '08:00:00', '09:30:00', null, null, true),
  ('SORE', '15:30:00', '17:00:00', null, null, true)
on conflict (session) do update set
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  active_date_start = excluded.active_date_start,
  active_date_end = excluded.active_date_end,
  is_active = excluded.is_active;
