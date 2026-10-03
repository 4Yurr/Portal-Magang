-- Move regular attendance to one record per participant per day.
drop view if exists public.v_attendance;

alter table public.attendance
  drop constraint if exists uq_attendance_participant_day_session;

alter table public.attendance
  drop column if exists session;

alter table public.attendance
  add constraint uq_attendance_participant_day unique (participant_id, tanggal);

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

grant select on public.v_attendance to authenticated;

drop policy if exists "attendance_photos_insert_public" on storage.objects;
drop policy if exists "reports_insert_public" on storage.objects;
drop policy if exists "bpu_insert_public" on storage.objects;
drop policy if exists "pu_insert_public" on storage.objects;

drop policy if exists "bpu_insert_public" on public.akuisisi_bpu;
drop policy if exists "pu_insert_public" on public.akuisisi_pu;
revoke insert on public.akuisisi_bpu, public.akuisisi_pu from anon, authenticated;

create table if not exists public.daily_attendance_window (
  id boolean primary key default true check (id),
  open_time time not null,
  close_time time not null,
  updated_at timestamptz not null default now(),
  constraint daily_attendance_window_valid check (open_time < close_time)
);

insert into public.daily_attendance_window (id, open_time, close_time)
values (true, '08:00:00', '17:00:00')
on conflict (id) do nothing;

create or replace function public.enforce_daily_attendance_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  server_wib timestamp;
  attendance_window public.daily_attendance_window%rowtype;
begin
  server_wib := public.now_wib()::timestamp;
  select * into attendance_window
  from public.daily_attendance_window
  where id = true;

  if not found then
    raise exception using message = 'ATTENDANCE_WINDOW_NOT_CONFIGURED';
  end if;
  if server_wib::time < attendance_window.open_time or server_wib::time > attendance_window.close_time then
    raise exception using message = 'ATTENDANCE_WINDOW_CLOSED';
  end if;

  new.tanggal := server_wib::date;
  new.jam := server_wib::time;
  return new;
end;
$$;

drop trigger if exists trg_enforce_daily_attendance_window on public.attendance;
create trigger trg_enforce_daily_attendance_window
  before insert on public.attendance
  for each row execute function public.enforce_daily_attendance_window();

drop trigger if exists trg_daily_attendance_window_updated on public.daily_attendance_window;
create trigger trg_daily_attendance_window_updated
  before update on public.daily_attendance_window
  for each row execute function public.set_updated_at();

alter table public.daily_attendance_window enable row level security;

drop policy if exists "daily_attendance_window_select_public" on public.daily_attendance_window;
create policy "daily_attendance_window_select_public" on public.daily_attendance_window
  for select using (true);

drop policy if exists "daily_attendance_window_update_admin" on public.daily_attendance_window;
create policy "daily_attendance_window_update_admin" on public.daily_attendance_window
  for update using (public.is_admin()) with check (public.is_admin());

grant select on public.daily_attendance_window to anon, authenticated;
grant update on public.daily_attendance_window to authenticated;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  image_file_id text,
  image_filename text,
  attachment_file_id text,
  attachment_filename text,
  attachment_mime_type text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_published_created
  on public.announcements (created_at desc) where is_published;

drop trigger if exists trg_announcements_updated on public.announcements;
create trigger trg_announcements_updated
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_published" on public.announcements;
create policy "announcements_select_published" on public.announcements
  for select using (is_published or public.is_admin());

drop policy if exists "announcements_insert_admin" on public.announcements;
create policy "announcements_insert_admin" on public.announcements
  for insert with check (public.is_admin());

drop policy if exists "announcements_update_admin" on public.announcements;
create policy "announcements_update_admin" on public.announcements
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_delete_admin" on public.announcements
  for delete using (public.is_admin());

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;