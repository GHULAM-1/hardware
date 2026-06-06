-- ============================================================================
-- 0606 — Staff management RLS (SUPER-ADMIN ONLY, all operations)
-- Unlike every other business table, staff data (salaries especially) must be
-- invisible to read-only admins. So the SELECT policy is is_super_admin(), NOT the
-- is_active_user() that apply_standard_rls would stamp. Since Server Actions and the
-- AI assistant run RLS-scoped on the caller's token, this also naturally restricts
-- assistant reads of staff data to the owner's session.
-- ============================================================================

alter table public.staff enable row level security;
create policy "staff_select" on public.staff
  for select using (public.is_super_admin());
create policy "staff_insert" on public.staff
  for insert with check (public.is_super_admin());
create policy "staff_update" on public.staff
  for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "staff_delete" on public.staff
  for delete using (public.is_super_admin());

alter table public.staff_attendance enable row level security;
create policy "staff_attendance_select" on public.staff_attendance
  for select using (public.is_super_admin());
create policy "staff_attendance_insert" on public.staff_attendance
  for insert with check (public.is_super_admin());
create policy "staff_attendance_update" on public.staff_attendance
  for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "staff_attendance_delete" on public.staff_attendance
  for delete using (public.is_super_admin());

alter table public.salary_advances enable row level security;
create policy "salary_advances_select" on public.salary_advances
  for select using (public.is_super_admin());
create policy "salary_advances_insert" on public.salary_advances
  for insert with check (public.is_super_admin());
create policy "salary_advances_update" on public.salary_advances
  for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "salary_advances_delete" on public.salary_advances
  for delete using (public.is_super_admin());

alter table public.salary_payments enable row level security;
create policy "salary_payments_select" on public.salary_payments
  for select using (public.is_super_admin());
create policy "salary_payments_insert" on public.salary_payments
  for insert with check (public.is_super_admin());
create policy "salary_payments_update" on public.salary_payments
  for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "salary_payments_delete" on public.salary_payments
  for delete using (public.is_super_admin());
