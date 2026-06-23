-- Capture the discontinued date and an estimated end-of-support date
-- (discontinued + 7 years) used for rough end-of-support planning.
-- Run after 0004_paper_size_class.sql in the Supabase SQL editor.

alter table devices
  add column if not exists discontinued_date         date,
  add column if not exists estimated_end_of_support  date;

create index if not exists idx_devices_estimated_eos on devices(estimated_end_of_support);
