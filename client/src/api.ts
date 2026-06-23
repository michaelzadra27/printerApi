import type { ParseResult, ParsedDevice, ParsedSupply } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';

export interface CatalogDevice {
  id: string;
  manufacturer: string | null;
  model: string;
  full_name: string | null;
  device_class: string;
  color_capability: string | null;
  technology: string | null;
  part_number: string | null;
  street_price: number | null;
  srp_price: number | null;
  intro_date: string | null;
  manufacturing_status: string | null;
  speed_ppm: number | null;
  speed_raw: string | null;
  first_copy_out_sec: number | null;
  scan_speed_simplex_black: number | null;
  scan_speed_simplex_color: number | null;
  scan_speed_duplex_black: number | null;
  scan_speed_duplex_color: number | null;
  document_feeder: string | null;
  scanner_feeder_type: string | null;
  fax_capable: boolean | null;
  has_ethernet: boolean | null;
  has_wifi: boolean | null;
  has_nfc: boolean | null;
  network_interface_raw: string | null;
  max_paper_size: string | null;
  paper_size_class: string | null;
  supply_count: number;
  parse_confidence: number | null;
  updated_at: string;
}

export async function listDevices(): Promise<CatalogDevice[]> {
  const res = await fetch(`${BASE}/api/devices`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Load failed (${res.status})`);
  return (await res.json()).devices;
}

export interface DetailSupply {
  id: string;
  description: string;
  part_number: string | null;
  color: string | null;
  yield_pages: number | null;
  price: number | null;
  coverage: string | null;
  supply_type: string | null;
}

export interface DeviceDetail {
  device: Record<string, unknown> & {
    id: string;
    manufacturer: string | null;
    model: string;
    attributes: Record<string, Record<string, string>>;
  };
  supplies: DetailSupply[];
  attributes: Record<string, Record<string, string>>;
  imageUrl: string | null;
}

export async function getDevice(id: string): Promise<DeviceDetail> {
  const res = await fetch(`${BASE}/api/devices/${id}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Load failed (${res.status})`);
  return res.json();
}

export async function parseDevice(rawText: string): Promise<ParseResult> {
  const res = await fetch(`${BASE}/api/parse-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Parse failed (${res.status})`);
  return res.json();
}

export interface SaveResponse {
  id?: string;
  updated?: boolean;
  error?: string;
  message?: string;
  existingId?: string;
}

export async function saveDevice(payload: {
  device: ParsedDevice;
  supplies: ParsedSupply[];
  attributes: Record<string, Record<string, string>>;
  rawText?: string;
  confidence?: number;
  imageBase64?: string;
  overwrite?: boolean;
}): Promise<{ status: number; body: SaveResponse }> {
  const res = await fetch(`${BASE}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as SaveResponse;
  return { status: res.status, body };
}
