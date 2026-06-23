-- uStack Device Catalog — initial schema
-- Hybrid model: first-class columns for queryable/core fields, JSONB for the
-- long tail. Run in the Supabase SQL editor (or via the Supabase CLI).

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Manufacturers (normalized, with alias collapsing) ───────────────────────
create table if not exists manufacturers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,        -- canonical, e.g. "HP"
  aliases     text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ── Device class enum ───────────────────────────────────────────────────────
do $$ begin
  create type device_class as enum
    ('printer', 'mfp', 'copier', 'scanner', 'production', 'fax', 'unknown');
exception when duplicate_object then null;
end $$;

-- ── Devices ─────────────────────────────────────────────────────────────────
create table if not exists devices (
  id                       uuid primary key default gen_random_uuid(),
  manufacturer_id          uuid references manufacturers(id) on delete set null,

  -- Identity
  model                    text not null,
  full_name                text,
  device_class             device_class not null default 'unknown',
  color_capability         text,          -- 'color' | 'mono'
  technology               text,          -- 'laser' | 'inkjet' | 'led'

  -- SKU / pricing / lifecycle
  part_number              text,
  street_price             numeric(10,2),
  srp_price                numeric(10,2),
  intro_date               text,          -- kept as-is ("May 2019"); normalize later
  manufacturing_status     text,          -- 'active' | 'discontinued'
  manufacturing_status_raw text,

  -- Performance (raw + parsed)
  speed_ppm_black          integer,
  speed_ppm_color          integer,
  speed_raw                text,
  first_copy_out_sec       numeric(6,2),
  first_copy_out_raw       text,
  scan_speed_ipm           integer,
  scan_speed_raw           text,

  -- Capabilities (elevated)
  fax_capable              boolean,
  fax_raw                  text,
  has_ethernet             boolean,
  has_wifi                 boolean,
  has_nfc                  boolean,
  network_interface_raw    text,

  -- Paper
  max_paper_size           text,

  -- Long tail + provenance
  attributes               jsonb not null default '{}'::jsonb,
  raw_text                 text,
  image_path               text,          -- Supabase Storage object path
  parse_confidence         numeric(4,2),

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Duplicate handling: warn/merge is enforced in the API, but a soft guard here.
  unique (manufacturer_id, model)
);

create index if not exists idx_devices_manufacturer on devices(manufacturer_id);
create index if not exists idx_devices_class         on devices(device_class);
create index if not exists idx_devices_model         on devices(lower(model));
create index if not exists idx_devices_attributes    on devices using gin (attributes);

-- ── Supplies (sellable SKUs only; CPI-ready) ────────────────────────────────
create table if not exists device_supplies (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references devices(id) on delete cascade,
  description  text not null,
  part_number  text,
  color        text,            -- black | cyan | magenta | yellow | tri-color | color
  yield_pages  integer,
  price        numeric(10,2),
  coverage     text,            -- e.g. "ISO/IEC 19798"
  supply_type  text,            -- toner | ink | drum | cartridge | maintenance
  raw_line     text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_supplies_device on device_supplies(device_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_devices_updated_at on devices;
create trigger trg_devices_updated_at
  before update on devices
  for each row execute function set_updated_at();
