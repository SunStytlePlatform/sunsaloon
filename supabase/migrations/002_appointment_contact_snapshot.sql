-- Keep the contact details typed on each booking. customers is keyed by phone and is not overwritten,
-- so without this a booking made with someone else's phone number would show that person's name.
-- Run this BEFORE deploying the backend version that writes these columns.
alter table appointments
  add column if not exists contact_name  text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

-- Backfill existing rows from the linked customer.
update appointments a
set contact_name = c.name, contact_phone = c.phone, contact_email = c.email
from customers c
where a.customer_id = c.id and a.contact_phone is null;
