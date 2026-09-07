-- Ensure storage buckets exist if they were removed from the dashboard.
insert into storage.buckets (id, name, public)
values
  ('attendance-photos', 'attendance-photos', false),
  ('reports', 'reports', false),
  ('bpu', 'bpu', false),
  ('pu', 'pu', false),
  ('materials', 'materials', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- Keep anonymous participant uploads enabled for the private upload buckets.
drop policy if exists "attendance_photos_insert_public" on storage.objects;
create policy "attendance_photos_insert_public" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'attendance-photos');

drop policy if exists "reports_insert_public" on storage.objects;
create policy "reports_insert_public" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'reports');

drop policy if exists "bpu_insert_public" on storage.objects;
create policy "bpu_insert_public" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'bpu');

drop policy if exists "pu_insert_public" on storage.objects;
create policy "pu_insert_public" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'pu');