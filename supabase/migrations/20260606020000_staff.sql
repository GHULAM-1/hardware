-- ============================================================================
-- 0606 — Staff management (non-login employees)
-- Staff are NOT auth users (no login). The owner registers employees, marks daily
-- attendance (present/absent), records mid-month salary advances, and records the
-- monthly salary actually paid. Salary math is computed in the app
-- (perDay = monthly_salary / days-in-month; net = salary − absences×perDay − advances).
--
-- SECURITY: these tables are SUPER-ADMIN ONLY for ALL operations (including SELECT)
-- because salaries are sensitive — read-only admins must NOT see them. We therefore
-- do NOT use apply_standard_rls (its SELECT policy is is_active_user). The custom
-- super-admin-only policies live in the next migration (…020100_staff_rls.sql).
-- ============================================================================

create type public.staff_attendance_status as enum ('present', 'absent');

-- ── Staff (employees) ───────────────────────────────────────────────────────
create table public.staff (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- Phone is the unique key per employee (PK local format 03XXXXXXXXX, app-validated).
  phone           text not null unique,
  cnic            text,                       -- 13 raw digits; formatted in the UI
  address         text,
  image_url       text,
  monthly_salary  numeric(12,2) not null check (monthly_salary >= 0),
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- CNIC identifies one human: unique when present (optional field).
create unique index staff_cnic_uniq on public.staff (cnic) where cnic is not null;
create index staff_active_idx on public.staff (is_active);

create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- ── Daily attendance (one row per staff per day) ─────────────────────────────
create table public.staff_attendance (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff (id) on delete cascade,
  date        date not null,
  status      public.staff_attendance_status not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (staff_id, date)                     -- upsert target for the daily save
);
create index staff_attendance_staff_idx on public.staff_attendance (staff_id);
create index staff_attendance_date_idx  on public.staff_attendance (date);

create trigger trg_staff_attendance_updated_at
  before update on public.staff_attendance
  for each row execute function public.set_updated_at();

-- ── Salary advances (money taken mid-month) ──────────────────────────────────
create table public.salary_advances (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid not null references public.staff (id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  advance_date  date not null,
  note          text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index salary_advances_staff_idx on public.salary_advances (staff_id);
create index salary_advances_date_idx  on public.salary_advances (advance_date);

create trigger trg_salary_advances_updated_at
  before update on public.salary_advances
  for each row execute function public.set_updated_at();

-- ── Salary payments (one settlement per staff per month) ─────────────────────
-- The computed figures are SNAPSHOT here at pay time, so a later salary change or
-- back-dated attendance edit never rewrites what a paid month shows. on delete
-- restrict protects paid history from an accidental staff delete.
create table public.salary_payments (
  id                 uuid primary key default gen_random_uuid(),
  staff_id           uuid not null references public.staff (id) on delete restrict,
  period_month       date not null check (date_trunc('month', period_month) = period_month),
  amount_paid        numeric(12,2) not null check (amount_paid >= 0),
  paid_on            date not null,
  note               text,
  monthly_salary     numeric(12,2) not null,            -- snapshot
  absence_deduction  numeric(12,2) not null default 0,  -- snapshot
  advances_total     numeric(12,2) not null default 0,  -- snapshot
  computed_net       numeric(12,2) not null,            -- snapshot (may be negative)
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (staff_id, period_month)
);
create index salary_payments_staff_idx on public.salary_payments (staff_id);

create trigger trg_salary_payments_updated_at
  before update on public.salary_payments
  for each row execute function public.set_updated_at();
