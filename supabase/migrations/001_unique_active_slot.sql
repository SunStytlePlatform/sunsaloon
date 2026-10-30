-- One pending/confirmed appointment per date + time (single-chair salon).
-- If the salon can serve several customers at once, add the staff/chair column to this index instead.
--
-- Before running: this fails if duplicate active slots already exist. Find them with
--   select appointment_date, appointment_time, count(*)
--   from appointments where status in ('pending', 'confirmed')
--   group by 1, 2 having count(*) > 1;
-- and reject/cancel the extras first.
create unique index if not exists appointments_unique_active_slot
  on appointments (appointment_date, appointment_time)
  where status in ('pending', 'confirmed');
