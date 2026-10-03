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