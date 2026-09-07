-- Ensure anonymous participants can submit seminar attendance.
-- The participant portal writes to seminar_attendance without authentication.

alter table public.seminar_attendance enable row level security;

drop policy if exists "seminar_insert_public" on public.seminar_attendance;
create policy "seminar_insert_public" on public.seminar_attendance
  for insert
  to anon, authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert on public.seminar_attendance to anon, authenticated;
