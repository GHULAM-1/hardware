-- ============================================================================
-- 0100 — Module 1: Auth & RBAC
-- Two roles only: super_admin (full mutation) / admin (read-only everywhere).
-- Users are provisioned via Supabase Auth; profiles mirrors auth.users.
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'admin',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RBAC helpers (SECURITY DEFINER so RLS policies can call them without
-- recursing back through the profiles table's own policies). Defined here,
-- after profiles exists, because SQL functions validate their body at create.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and is_active
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active
  );
$$;

alter table public.profiles enable row level security;

-- Everyone active can read profiles; only super_admin can mutate.
-- (A user can always read their own row even before activation checks.)
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_active_user());

create policy "profiles_insert" on public.profiles
  for insert with check (public.is_super_admin());

create policy "profiles_update" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

create policy "profiles_delete" on public.profiles
  for delete using (public.is_super_admin());
