-- ============================================================================
-- Migration: 0004_fixes_and_enhancements.sql
-- Fixes RLS gaps, adds updated_at columns, storage admin policies,
-- and makes attendance_open_info() read from attendance_settings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Public SELECT on attendance_settings
--    Participant portal needs to read the schedule without authentication.
-- ----------------------------------------------------------------------------
drop policy if exists "attendance_settings_select_public" on public.attendance_settings;
create policy "attendance_settings_select_public" on public.attendance_settings
  for select using (true);

-- Drop the admin-only select policy (replaced by public policy above)
drop policy if exists "attendance_settings_select_admin" on public.attendance_settings;

-- ----------------------------------------------------------------------------
-- 2. Add updated_at to attendance table for audit/tracking
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attendance' and column_name = 'updated_at'
  ) then
    alter table public.attendance add column updated_at timestamptz not null default now();
  end if;
end $$;

drop trigger if exists trg_attendance_updated on public.attendance;
create trigger trg_attendance_updated
  before update on public.attendance
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Add updated_at to akuisisi_bpu and akuisisi_pu for admin edit tracking
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'akuisisi_bpu' and column_name = 'updated_at'
  ) then
    alter table public.akuisisi_bpu add column updated_at timestamptz not null default now();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'akuisisi_pu' and column_name = 'updated_at'
  ) then
    alter table public.akuisisi_pu add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Add drive metadata columns to akuisisi_bpu
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'akuisisi_bpu' and column_name = 'drive_file_id'
  ) then
    alter table public.akuisisi_bpu add column drive_file_id text;
    alter table public.akuisisi_bpu add column drive_url text;
  end if;
end $$;

-- Add drive metadata columns to akuisisi_pu
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'akuisisi_pu' and column_name = 'drive_file_id'
  ) then
    alter table public.akuisisi_pu add column drive_file_id text;
    alter table public.akuisisi_pu add column drive_url text;
  end if;
end $$;

drop trigger if exists trg_akuisisi_bpu_updated on public.akuisisi_bpu;
create trigger trg_akuisisi_bpu_updated
  before update on public.akuisisi_bpu
  for each row execute function public.set_updated_at();

drop trigger if exists trg_akuisisi_pu_updated on public.akuisisi_pu;
create trigger trg_akuisisi_pu_updated
  before update on public.akuisisi_pu
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Add updated_at to seminar_attendance for tracking
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'seminar_attendance' and column_name = 'updated_at'
  ) then
    alter table public.seminar_attendance add column updated_at timestamptz not null default now();
  end if;
end $$;

drop trigger if exists trg_seminar_attendance_updated on public.seminar_attendance;
create trigger trg_seminar_attendance_updated
  before update on public.seminar_attendance
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Update attendance_open_info() to read from attendance_settings
-- ----------------------------------------------------------------------------
create or replace function public.attendance_open_info()
returns table (
  session text,
  is_open boolean,
  message text
) language sql stable as $$
  select
    s.session::text,
    (
      s.is_active
      and (s.active_date_start is null or current_date >= s.active_date_start)
      and (s.active_date_end is null or current_date <= s.active_date_end)
      and (
        (public.now_wib())::timestamp::time between s.start_time and s.end_time
      )
    ),
    case
      when not s.is_active then 'Absensi ' || s.session::text || ' tidak aktif.'
      when s.active_date_start is not null and current_date < s.active_date_start then
        'Absensi ' || s.session::text || ' belum dimulai.'
      when s.active_date_end is not null and current_date > s.active_date_end then
        'Absensi ' || s.session::text || ' sudah berakhir.'
      when (public.now_wib())::timestamp::time < s.start_time then
        'Absensi ' || s.session::text || ' belum dibuka (' || to_char(s.start_time, 'HH24:MI') || ' - ' || to_char(s.end_time, 'HH24:MI') || ' WIB).'
      when (public.now_wib())::timestamp::time > s.end_time then
        'Absensi ' || s.session::text || ' sudah ditutup (' || to_char(s.start_time, 'HH24:MI') || ' - ' || to_char(s.end_time, 'HH24:MI') || ' WIB).'
      else
        'Absensi ' || s.session::text || ' Dibuka (' || to_char(s.start_time, 'HH24:MI') || ' - ' || to_char(s.end_time, 'HH24:MI') || ' WIB).'
    end
  from public.attendance_settings s
  order by s.session;
$$;

-- ----------------------------------------------------------------------------
-- 6. Recreate views to include updated_at
-- ----------------------------------------------------------------------------
drop view if exists public.v_attendance;
create or replace view public.v_attendance
with (security_invoker = true) as
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
  a.created_at,
  a.updated_at
from public.attendance a
left join public.participants p on p.nim = a.participant_id;

drop view if exists public.v_seminar;
create or replace view public.v_seminar
with (security_invoker = true) as
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
  s.created_at,
  s.updated_at
from public.seminar_attendance s
left join public.participants p on p.nim = s.participant_id;

drop view if exists public.v_reports;
create or replace view public.v_reports
with (security_invoker = true) as
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
-- 7. Storage policies: Admin DELETE on private buckets
-- ----------------------------------------------------------------------------
-- attendance-photos
drop policy if exists "attendance_photos_admin_delete" on storage.objects;
create policy "attendance_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'attendance-photos' and public.is_admin());

-- reports
drop policy if exists "reports_admin_delete" on storage.objects;
create policy "reports_admin_delete" on storage.objects
  for delete using (bucket_id = 'reports' and public.is_admin());

-- bpu
drop policy if exists "bpu_admin_delete" on storage.objects;
create policy "bpu_admin_delete" on storage.objects
  for delete using (bucket_id = 'bpu' and public.is_admin());

-- pu
drop policy if exists "pu_admin_delete" on storage.objects;
create policy "pu_admin_delete" on storage.objects
  for delete using (bucket_id = 'pu' and public.is_admin());

-- materials: admin can update and delete
drop policy if exists "materials_admin_update" on storage.objects;
create policy "materials_admin_update" on storage.objects
  for update using (bucket_id = 'materials' and public.is_admin());

drop policy if exists "materials_admin_delete" on storage.objects;
create policy "materials_admin_delete" on storage.objects
  for delete using (bucket_id = 'materials' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. tiktok_submissions: admin UPDATE policy (was missing)
-- ----------------------------------------------------------------------------
drop policy if exists "tiktok_update_admin" on public.tiktok_submissions;
create policy "tiktok_update_admin" on public.tiktok_submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. reports: admin UPDATE policy (for potential future edits)
-- ----------------------------------------------------------------------------
drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. audit_logs: allow insert for any authenticated user (not just admin)
--     This is needed so admin service functions can log even if the insert
--     check was overly restrictive.
-- ----------------------------------------------------------------------------
drop policy if exists "audit_logs_insert_any_auth" on public.audit_logs;
create policy "audit_logs_insert_any_auth" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 11. SQL privileges for PostgREST roles
--     RLS policies decide which rows are allowed, but PostgREST also needs table
--     privileges for anon/authenticated roles. Missing grants surface as 42501.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.participants to anon, authenticated;
grant select on public.materials to anon, authenticated;
grant select on public.attendance_settings to anon, authenticated;
grant execute on function public.now_wib() to anon, authenticated;
grant execute on function public.attendance_open_info() to anon, authenticated;

grant insert on public.attendance to anon, authenticated;
grant insert on public.seminar_attendance to anon, authenticated;
grant insert on public.tiktok_submissions to anon, authenticated;
grant insert on public.reports to anon, authenticated;
grant insert on public.akuisisi_bpu to anon, authenticated;
grant insert on public.akuisisi_pu to anon, authenticated;

grant select, insert, update, delete on public.admin_roles to authenticated;
grant select, insert, update, delete on public.participants to authenticated;
grant select, update, delete on public.attendance to authenticated;
grant select, update, delete on public.seminar_attendance to authenticated;
grant select, update, delete on public.tiktok_submissions to authenticated;
grant select, update, delete on public.reports to authenticated;
grant select, update, delete on public.akuisisi_bpu to authenticated;
grant select, update, delete on public.akuisisi_pu to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update on public.attendance_settings to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select on public.v_attendance, public.v_seminar, public.v_reports to authenticated;
