alter table public.attendance
  add column if not exists admin_note text,
  add column if not exists created_by uuid references auth.users(id);

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
  a.updated_at,
  a.admin_note,
  a.created_by
from public.attendance a
left join public.participants p on p.nim = a.participant_id;

grant select on public.v_attendance to authenticated;

create or replace function public.enforce_daily_attendance_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  server_wib timestamp without time zone;
  attendance_window public.daily_attendance_window%rowtype;
begin
  if public.is_admin() then
    if nullif(trim(new.admin_note), '') is null then
      raise exception using message = 'ADMIN_ATTENDANCE_REASON_REQUIRED';
    end if;

    new.created_by := auth.uid();

    insert into public.audit_logs (
      actor_email,
      table_name,
      record_id,
      action,
      after_value
    )
    values (
      auth.jwt() ->> 'email',
      'attendance',
      new.id::text,
      'CREATE',
      to_jsonb(new)
    );

    return new;
  end if;

  new.admin_note := null;
  new.created_by := null;

  server_wib := timezone('Asia/Jakarta', clock_timestamp());
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
