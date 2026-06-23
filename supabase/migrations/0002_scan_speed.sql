-- Capture scan speed as simplex AND duplex (color + black) instead of a single
-- value, plus the document-feeder type, so scanner quality (single-pass vs
-- reversing) can be determined downstream.
-- Run after 0001_init.sql in the Supabase SQL editor.

alter table devices
  add column if not exists scan_speed_simplex_black integer,
  add column if not exists scan_speed_simplex_color integer,
  add column if not exists scan_speed_duplex_black  integer,
  add column if not exists scan_speed_duplex_color  integer,
  add column if not exists document_feeder          text,
  add column if not exists scanner_feeder_type      text; -- 'single-pass' | 'reversing'

-- The old single scan-speed column is superseded.
alter table devices drop column if exists scan_speed_ipm;
