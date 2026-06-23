import { useEffect, useMemo, useState } from 'react';
import { listDevices, type CatalogDevice } from '../api';
import { toCsv, downloadCsv, type CsvColumn } from '../csv';

// Columns included in the CSV export (a superset of what the table shows).
const CSV_COLUMNS: CsvColumn[] = [
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'model', label: 'Model' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'device_class', label: 'Class' },
  { key: 'color_capability', label: 'Color' },
  { key: 'technology', label: 'Technology' },
  { key: 'part_number', label: 'Part #' },
  { key: 'street_price', label: 'Street Price' },
  { key: 'srp_price', label: 'SRP' },
  { key: 'intro_date', label: 'Intro Date' },
  { key: 'manufacturing_status', label: 'Status' },
  { key: 'speed_ppm', label: 'Speed (ppm)' },
  { key: 'first_copy_out_sec', label: 'First Copy Out (s)' },
  { key: 'scan_speed_simplex_black', label: 'Scan Simplex B/W' },
  { key: 'scan_speed_simplex_color', label: 'Scan Simplex Color' },
  { key: 'scan_speed_duplex_black', label: 'Scan Duplex B/W' },
  { key: 'scan_speed_duplex_color', label: 'Scan Duplex Color' },
  { key: 'document_feeder', label: 'Document Feeder' },
  { key: 'scanner_feeder_type', label: 'Feeder Type' },
  { key: 'fax_capable', label: 'Fax' },
  { key: 'has_ethernet', label: 'Ethernet' },
  { key: 'has_wifi', label: 'Wi-Fi' },
  { key: 'has_nfc', label: 'NFC' },
  { key: 'network_interface_raw', label: 'Network Interface' },
  { key: 'max_paper_size', label: 'Max Paper Size' },
  { key: 'paper_size_class', label: 'Paper Class' },
  { key: 'supply_count', label: 'Supplies' },
  { key: 'updated_at', label: 'Updated' },
];

function bool(v: boolean | null): string {
  return v === true ? '✓' : v === false ? '✗' : '—';
}

export default function CatalogScreen() {
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listDevices()
      .then(setDevices)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      [d.manufacturer, d.model, d.full_name, d.part_number, d.device_class]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [devices, search]);

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`device-catalog-${stamp}.csv`, toCsv(filtered as unknown as Record<string, unknown>[], CSV_COLUMNS));
  }

  if (loading) return <p className="text-sm text-slate-500">Loading catalog…</p>;

  if (error) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Couldn’t load the catalog.</p>
        <p className="mt-1 text-amber-800">{error}</p>
        {/Supabase not configured/i.test(error) && (
          <p className="mt-1 text-amber-800">
            This is expected on a local server without keys — the deployed app reads the live database.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search manufacturer, model, part #…"
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {filtered.length} of {devices.length} device{devices.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No devices saved yet. Use <span className="font-medium">Add Device</span> to parse and save one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                {['Manufacturer', 'Model', 'Class', 'Color', 'Paper', 'Speed', 'Status', 'Feeder', 'Fax', 'Wi-Fi', 'Supplies'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2">{d.manufacturer ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{d.model}</td>
                  <td className="px-3 py-2 uppercase">{d.device_class}</td>
                  <td className="px-3 py-2">{d.color_capability ?? '—'}</td>
                  <td className="px-3 py-2">{d.paper_size_class ?? '—'}</td>
                  <td className="px-3 py-2">{d.speed_ppm ?? '—'}</td>
                  <td className="px-3 py-2">{d.manufacturing_status ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{d.scanner_feeder_type ?? '—'}</td>
                  <td className="px-3 py-2">{bool(d.fax_capable)}</td>
                  <td className="px-3 py-2">{bool(d.has_wifi)}</td>
                  <td className="px-3 py-2">{d.supply_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
