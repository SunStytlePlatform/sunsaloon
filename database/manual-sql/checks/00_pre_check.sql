-- READ ONLY. Run this BEFORE the migrations. It only reads; it changes nothing.
-- Paste the whole file into Supabase -> SQL Editor and click Run. You get one table of checks.
--
-- Verdict column:  OK    = good
--                  STOP  = do not continue; send the result to the developer
--                  NOTE  = just write the value down (you need it again in checks/99_final_check.sql)
--                  INFO  = for your information, nothing to do
--
-- If you get an error like  relation "public.customers" does not exist  -> STOP, this is not the right project/schema.

with
tables_found as (
  select count(*) as n
  from information_schema.tables
  where table_schema = 'public' and table_name in ('customers', 'appointments', 'services', 'shop_settings')
),
appt_cols as (
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'appointments'
),
appt_pk as (
  select kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
   and kcu.table_name = tc.table_name
  where tc.table_schema = 'public' and tc.table_name = 'appointments' and tc.constraint_type = 'PRIMARY KEY'
),
-- A short fingerprint of each existing table's structure (columns, indexes, constraints, triggers, RLS flag).
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
  select 1 as step, 'Existing tables found (customers, appointments, services, shop_settings)' as check_name,
         (select n from tables_found)::text as actual, '4' as expected,
         case when (select n from tables_found) = 4 then 'OK' else 'STOP' end as verdict

  union all
  select 2, 'appointments.id has type uuid',
         coalesce((select data_type from appt_cols where column_name = 'id'), 'missing'), 'uuid',
         case when (select data_type from appt_cols where column_name = 'id') = 'uuid' then 'OK' else 'STOP' end

  union all
  select 3, 'appointments.id is the primary key',
         coalesce((select column_name from appt_pk where column_name = 'id'), 'no'), 'id',
         case when exists (select 1 from appt_pk where column_name = 'id') then 'OK' else 'STOP' end

  union all
  select 4, 'appointments.appointment_date has type date',
         coalesce((select data_type from appt_cols where column_name = 'appointment_date'), 'missing'), 'date',
         case when (select data_type from appt_cols where column_name = 'appointment_date') = 'date' then 'OK' else 'STOP' end

  union all
  select 5, 'appointments.appointment_time has a time type',
         coalesce((select data_type from appt_cols where column_name = 'appointment_time'), 'missing'), 'time without time zone',
         case when (select data_type from appt_cols where column_name = 'appointment_time') like 'time%' then 'OK' else 'STOP' end

  union all
  select 6, 'New table appointment_contacts already exists?',
         case when to_regclass('public.appointment_contacts') is null then 'no' else 'yes' end, 'either is fine', 'INFO'

  union all
  select 7, 'New table appointment_slot_locks already exists?',
         case when to_regclass('public.appointment_slot_locks') is null then 'no' else 'yes' end, 'either is fine', 'INFO'

  union all
  select 8, 'Rows in ' || table_name, n::text, 'write this number down', 'NOTE' from counts

  union all
  select 9, 'Fingerprint of ' || table_name, fingerprint, 'write this value down', 'NOTE' from fp

  union all
  select 10, 'Date+time slots that already have more than one pending/confirmed appointment',
         (select count(*) from (
            select 1 from public.appointments
            where status in ('pending', 'confirmed')
            group by appointment_date, appointment_time
            having count(*) > 1) d)::text,
         'any number is fine (nothing is changed or blocked for old data)', 'INFO'
) r
order by step, check_name;
