-- READ ONLY. Run this LAST, after both migrations. It only reads; it changes nothing.
-- It proves your four existing tables are exactly as they were before.
--
-- BEFORE YOU RUN: in the block marked  PASTE YOUR VALUES HERE  below, replace each PASTE_FINGERPRINT with the
-- "Fingerprint of <table>" value, and each 0 with the "Rows in <table>" number, that you wrote down from
-- checks/00_pre_check.sql.
--
-- Verdict:  OK = good   STOP = do not continue, send the result to the developer
--           PASTE = you have not pasted the "before" values yet
-- Row counts may be HIGHER than before (people may have booked in the meantime) but never lower.

with
-- ===================== PASTE YOUR VALUES HERE =====================
before_values(table_name, fingerprint, row_count) as (
  values
    ('customers',     'PASTE_FINGERPRINT', 0),
    ('appointments',  'PASTE_FINGERPRINT', 0),
    ('services',      'PASTE_FINGERPRINT', 0),
    ('shop_settings', 'PASTE_FINGERPRINT', 0)
),
-- ==================================================================
fp as (
  select t.table_name,
         left(md5(
           coalesce((select string_agg(c.column_name || ':' || c.data_type || ':' || c.is_nullable, ',' order by c.ordinal_position)
                     from information_schema.columns c
                     where c.table_schema = 'public' and c.table_name = t.table_name), 'missing')
           || '|' || (select count(*) from pg_indexes i where i.schemaname = 'public' and i.tablename = t.table_name)
           || '|' || (select count(*) from pg_constraint k where k.conrelid = to_regclass('public.' || t.table_name))
           || '|' || (select count(*) from pg_trigger g where g.tgrelid = to_regclass('public.' || t.table_name) and not g.tgisinternal)
           || '|' || coalesce((select r.relrowsecurity::text from pg_class r where r.oid = to_regclass('public.' || t.table_name)), 'none')
         ), 10) as fingerprint
  from (values ('customers'), ('appointments'), ('services'), ('shop_settings')) as t(table_name)
),
counts as (
  select 'customers' as table_name, count(*) as n from public.customers
  union all select 'appointments', count(*) from public.appointments
  union all select 'services', count(*) from public.services
  union all select 'shop_settings', count(*) from public.shop_settings
)
select step, check_name, actual, expected, verdict
from (
  select 1 as step, 'Structure of ' || f.table_name || ' is unchanged' as check_name,
         f.fingerprint as actual, b.fingerprint as expected,
         case when b.fingerprint = 'PASTE_FINGERPRINT' then 'PASTE'
              when b.fingerprint = f.fingerprint then 'OK' else 'STOP' end as verdict
  from fp f join before_values b using (table_name)

  union all
  select 2, 'Rows in ' || c.table_name || ' (no rows lost)',
         c.n::text, '>= ' || b.row_count::text,
         case when b.fingerprint = 'PASTE_FINGERPRINT' then 'PASTE'
              when c.n >= b.row_count then 'OK' else 'STOP' end
  from counts c join before_values b using (table_name)

  union all
  select 3, 'New table appointment_contacts present',
         case when to_regclass('public.appointment_contacts') is null then 'no' else 'yes' end, 'yes',
         case when to_regclass('public.appointment_contacts') is not null then 'OK' else 'STOP' end

  union all
  select 4, 'New table appointment_slot_locks present',
         case when to_regclass('public.appointment_slot_locks') is null then 'no' else 'yes' end, 'yes',
         case when to_regclass('public.appointment_slot_locks') is not null then 'OK' else 'STOP' end

  union all
  select 5, 'Both new tables have row level security on',
         ((select relrowsecurity::text from pg_class where oid = to_regclass('public.appointment_contacts')) || ' / ' ||
          (select relrowsecurity::text from pg_class where oid = to_regclass('public.appointment_slot_locks'))),
         'true / true',
         case when (select relrowsecurity from pg_class where oid = to_regclass('public.appointment_contacts'))
                and (select relrowsecurity from pg_class where oid = to_regclass('public.appointment_slot_locks')) then 'OK' else 'STOP' end
) r
order by step, check_name;
