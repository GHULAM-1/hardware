-- ============================================================================
-- 0623 — Staff joining date
-- Adds joined_on: the date an employee actually started. Attendance and salary
-- only count from this date, so a newly-added employee never accrues phantom
-- absences or back-pay for months BEFORE they joined (previously every active
-- staff member showed up — fully owed — in every past salary month).
--
-- Existing rows backfill to their created_at date (best available proxy); the
-- owner can correct it per employee from the staff form.
-- ============================================================================

alter table public.staff
  add column joined_on date not null default current_date;

-- Backfill existing staff to when their record was created.
update public.staff set joined_on = created_at::date;

create index staff_joined_on_idx on public.staff (joined_on);
