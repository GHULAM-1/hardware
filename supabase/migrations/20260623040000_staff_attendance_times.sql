-- ============================================================================
-- 0623 — Staff attendance entry/exit times
-- Optional check-in / check-out time per staff per day. Only meaningful when the
-- staff member is present; absent rows leave both null. Stored as `time` (no TZ —
-- it's a wall-clock shop time, same as the rest of the attendance day).
-- ============================================================================

alter table public.staff_attendance
  add column entry_time time,
  add column exit_time  time;
