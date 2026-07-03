-- ============================================================================
-- Tab lock — password-gated navigation tabs (one app-wide shared password)
-- A super_admin can lock any set of nav tabs behind a single password. The
-- locked-tab list is readable (clients gate on it); the bcrypt password hash is
-- NEVER exposed to clients — only the SECURITY DEFINER RPCs below can read it.
-- ============================================================================

-- Single-row table (id is always true). Holds the locked hrefs + the bcrypt hash.
create table if not exists public.tab_lock (
  id            boolean primary key default true,
  locked_tabs   jsonb       not null default '[]'::jsonb,
  password_hash text,
  updated_at    timestamptz not null default now(),
  constraint tab_lock_singleton check (id = true)
);

insert into public.tab_lock (id) values (true) on conflict (id) do nothing;

-- RLS on with no policies + no table grants => no direct client access at all.
-- Every read/write goes through the SECURITY DEFINER functions below, so the
-- hash can never be selected by a client (not even a read-only admin).
alter table public.tab_lock enable row level security;
revoke all on public.tab_lock from anon, authenticated;

-- Read the locked-tab list only (never the hash). Any active user, so the client
-- knows which tabs to gate.
create or replace function public.get_locked_tabs()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce((select locked_tabs from public.tab_lock where id), '[]'::jsonb);
$$;

-- Verify the shared password. Returns true when no password is set (nothing to
-- unlock). Any active user may call it — it's how a locked tab is unlocked.
create or replace function public.verify_tab_lock_password(p_password text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare h text;
begin
  select password_hash into h from public.tab_lock where id;
  if h is null then
    return true;
  end if;
  return h = crypt(p_password, h);
end;
$$;

-- Set the locked tabs + password. super_admin only (RLS can't guard an RPC, so
-- we check explicitly). An empty tab list clears the lock AND the password.
-- A null/blank password with a non-empty tab list keeps the existing password
-- (used when editing the locked set after authenticating).
create or replace function public.set_tab_lock(p_tabs jsonb, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  update public.tab_lock set
    locked_tabs   = coalesce(p_tabs, '[]'::jsonb),
    password_hash = case
      when p_tabs is null or jsonb_array_length(p_tabs) = 0 then null
      when p_password is not null and length(p_password) > 0 then crypt(p_password, gen_salt('bf'))
      else password_hash
    end,
    updated_at    = now()
  where id;
end;
$$;

grant execute on function public.get_locked_tabs()              to authenticated;
grant execute on function public.verify_tab_lock_password(text) to authenticated;
grant execute on function public.set_tab_lock(jsonb, text)      to authenticated;
