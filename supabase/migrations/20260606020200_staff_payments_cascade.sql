-- ============================================================================
-- 0606 — Salary payments cascade on staff delete
-- Originally salary_payments referenced staff with ON DELETE RESTRICT to protect
-- paid history. Per the owner's request, deleting an employee should remove ALL
-- their records (attendance + advances already cascade), so switch the payments FK
-- to ON DELETE CASCADE too.
-- ============================================================================

alter table public.salary_payments
  drop constraint salary_payments_staff_id_fkey,
  add constraint salary_payments_staff_id_fkey
    foreign key (staff_id) references public.staff (id) on delete cascade;
