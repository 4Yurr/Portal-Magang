-- Allow participant portal uploads to the attendance photo bucket.
-- This bucket is used by both regular and seminar attendance.

drop policy if exists "attendance_photos_insert_public" on storage.objects;
create policy "attendance_photos_insert_public" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'attendance-photos');
