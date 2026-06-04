-- ============================================================================
-- 0150 — Standard RLS applier
-- Every business table follows the same rule: active users read, super_admin
-- writes. This helper stamps those four policies onto a table so the per-table
-- migrations stay short and consistent.
-- ============================================================================

create or replace function public.apply_standard_rls(p_table regclass)
returns void
language plpgsql
as $$
declare
  t text := p_table::text;     -- schema-qualified, e.g. public.items
  n text := split_part(replace(t, 'public.', ''), '.', 1);
begin
  execute format('alter table %s enable row level security;', t);

  execute format(
    'create policy %I on %s for select using (public.is_active_user());',
    n || '_select', t);

  execute format(
    'create policy %I on %s for insert with check (public.is_super_admin());',
    n || '_insert', t);

  execute format(
    'create policy %I on %s for update using (public.is_super_admin()) with check (public.is_super_admin());',
    n || '_update', t);

  execute format(
    'create policy %I on %s for delete using (public.is_super_admin());',
    n || '_delete', t);
end;
$$;
