-- ============================================================================
-- Migration: 0010_fix_public_acquisition_insert.sql
-- Allow the public participant forms to insert PU/BPU submissions while keeping
-- sensitive acquisition rows readable only by admins.
-- ============================================================================

alter table public.akuisisi_bpu enable row level security;
alter table public.akuisisi_pu enable row level security;

drop policy if exists "bpu_insert_public" on public.akuisisi_bpu;
create policy "bpu_insert_public" on public.akuisisi_bpu
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "pu_insert_public" on public.akuisisi_pu;
create policy "pu_insert_public" on public.akuisisi_pu
  for insert
  to anon, authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert on public.akuisisi_bpu to anon, authenticated;
grant insert on public.akuisisi_pu to anon, authenticated;
