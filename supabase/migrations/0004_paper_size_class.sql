-- Classify media handling as A3 (ledger/tabloid) or A4 (letter/legal).
-- Run after 0003_speed_single.sql in the Supabase SQL editor.

alter table devices add column if not exists paper_size_class text; -- 'A3' | 'A4'

create index if not exists idx_devices_paper_size_class on devices(paper_size_class);
