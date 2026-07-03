-- ============================================================================
-- Tab lock — return a version alongside the locked tabs.
-- The client keys its "unlocked this session" flag to this version, so changing
-- the lock (removing/re-adding tabs or setting a new password) bumps updated_at
-- and automatically invalidates any prior unlock — the gate then re-prompts.
-- ============================================================================

create or replace function public.get_locked_tabs()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'tabs',    coalesce(locked_tabs, '[]'::jsonb),
        'version', extract(epoch from updated_at)::bigint
      )
      from public.tab_lock
      where id
    ),
    jsonb_build_object('tabs', '[]'::jsonb, 'version', 0)
  );
$$;
