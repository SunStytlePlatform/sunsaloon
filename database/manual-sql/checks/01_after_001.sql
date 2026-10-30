-- READ ONLY. Run this right AFTER 001_appointment_contacts.sql. It only reads; it changes nothing.
-- Every verdict must be OK.

select step, check_name, actual, expected, verdict
from (
  select 1 as step, 'Table appointment_contacts exists' as check_name,
         case when to_regclass('public.appointment_contacts') is null then 'no' else 'yes' end as actual, 'yes' as expected,
         case when to_regclass('public.appointment_contacts') is not null then 'OK' else 'STOP' end as verdict

  union all
  select 2, 'Columns',
         coalesce((select string_agg(column_name, ', ' order by ordinal_position)
                   from information_schema.columns
                   where table_schema = 'public' and table_name = 'appointment_contacts'), 'none'),
         'appointment_id, contact_name, contact_phone, contact_email, created_at',
         case when (select string_agg(column_name, ', ' order by ordinal_position)
                    from information_schema.columns
                    where table_schema = 'public' and table_name = 'appointment_contacts')
                   = 'appointment_id, contact_name, contact_phone, contact_email, created_at' then 'OK' else 'STOP' end

  union all
  select 3, 'Primary key is appointment_id',
         coalesce((select string_agg(a.attname, ', ')
                   from pg_constraint k
                   join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any (k.conkey)
                   where k.conrelid = to_regclass('public.appointment_contacts') and k.contype = 'p'), 'none'),
         'appointment_id',
         case when exists (select 1 from pg_constraint k
                           join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any (k.conkey)
                           where k.conrelid = to_regclass('public.appointment_contacts') and k.contype = 'p'
                             and a.attname = 'appointment_id') then 'OK' else 'STOP' end

  union all
  select 4, 'Foreign key points to appointments(id) with ON DELETE CASCADE',
         coalesce((select case k.confdeltype when 'c' then 'cascade' else 'other' end
                   from pg_constraint k
                   where k.conrelid = to_regclass('public.appointment_contacts') and k.contype = 'f'
                     and k.confrelid = to_regclass('public.appointments')), 'missing'),
         'cascade',
         case when exists (select 1 from pg_constraint k
                           where k.conrelid = to_regclass('public.appointment_contacts') and k.contype = 'f'
                             and k.confrelid = to_regclass('public.appointments') and k.confdeltype = 'c') then 'OK' else 'STOP' end

  union all
  select 5, 'Row level security is on for the new table',
         coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.appointment_contacts')), 'missing'),
         'true',
         case when (select relrowsecurity from pg_class where oid = to_regclass('public.appointment_contacts')) then 'OK' else 'STOP' end

  union all
  select 6, 'Rows in the new table (0 right after creating it)',
         coalesce((select count(*)::text from public.appointment_contacts), 'missing'), '0 now, grows as people book', 'INFO'
) r
order by step;
