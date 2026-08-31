-- ============================================================================
-- Migration: 0005_admin_rls_and_upload_fixes.sql
-- Harden admin authorization used by RLS policies.
-- ============================================================================

-- is_admin() is used inside RLS policies. It must bypass table RLS on
-- admin_roles, otherwise admin checks can fail or recurse under invoker rights.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_roles ar
    join auth.users u on lower(trim(u.email)) = lower(trim(ar.email))
    where u.id = auth.uid()
      and ar.role in ('admin', 'superadmin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- A logged-in admin must be able to read their own mapped role for UI/debugging,
-- but admin authorization itself is decided by the SECURITY DEFINER function.
drop policy if exists "admin_roles_select_if_admin" on public.admin_roles;
drop policy if exists "admin_roles_select_self" on public.admin_roles;
create policy "admin_roles_select_self" on public.admin_roles
  for select
  using (
    exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(trim(u.email)) = lower(trim(admin_roles.email))
    )
    or public.is_admin()
  );
