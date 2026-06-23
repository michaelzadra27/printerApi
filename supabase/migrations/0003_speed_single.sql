-- Collapse the two print-speed columns into a single headline value
-- (max of black/color). We never display two speed numbers.
-- Run after 0002_scan_speed.sql in the Supabase SQL editor.

alter table devices add column if not exists speed_ppm integer;

-- Backfill existing rows from the old columns before dropping them.
update devices
  set speed_ppm = greatest(coalesce(speed_ppm_black, 0), coalesce(speed_ppm_color, 0))
  where speed_ppm is null
    and (speed_ppm_black is not null or speed_ppm_color is not null);
update devices set speed_ppm = null where speed_ppm = 0;

alter table devices drop column if exists speed_ppm_black;
alter table devices drop column if exists speed_ppm_color;
