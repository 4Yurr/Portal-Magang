-- ============================================================================
-- Migration: 0006_auto_admin_role_for_auth_users.sql
-- Keep the admin role mapping in sync with Supabase Auth users.
-- ============================================================================

-- New Auth users are admin users for this admin portal by default. The trigger
-- runs with the migration owner's privileges and is independent of RLS.
create or replace function public.provision_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null and btrim(new.email) <> '' then
    if not exists (
      select 1
      from public.admin_roles ar
      where lower(btrim(ar.email)) = lower(btrim(new.email))
    ) then
      insert into public.admin_roles (email, role)
      values (lower(btrim(new.email)), 'admin');
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.provision_admin_role() from public;

drop trigger if exists trg_provision_admin_role on auth.users;
create trigger trg_provision_admin_role
  after insert on auth.users
  for each row execute function public.provision_admin_role();

-- Repair Auth users created before this migration was applied. Existing roles
-- (including superadmin) are preserved by the conflict clause.
insert into public.admin_roles (email, role)
select lower(btrim(u.email)), 'admin'
from auth.users u
where u.email is not null
  and btrim(u.email) <> ''
  and not exists (
    select 1
    from public.admin_roles ar
    where lower(btrim(ar.email)) = lower(btrim(u.email))
  );
