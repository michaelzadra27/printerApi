import type { ParseResult, ParsedDevice, ParsedSupply } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';

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
