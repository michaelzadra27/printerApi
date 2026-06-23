import { useEffect, useState } from 'react';
import { getDevice, type DeviceDetail as Detail } from '../api';

interface Props {
  id: string;
  onClose: () => void;
}

interface FieldDef {
  key: string;
  label: string;
  kind?: 'bool' | 'money' | 'text';
}

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Identity',
    fields: [
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'device_class', label: 'Class' },
      { key: 'color_capability', label: 'Color' },
      { key: 'technology', label: 'Technology' },
      { key: 'paper_size_class', label: 'Paper class' },
    ],
  },
  {
    title: 'Pricing & Lifecycle',
    fields: [
      { key: 'part_number', label: 'Part #' },
      { key: 'street_price', label: 'Street price', kind: 'money' },
      { key: 'srp_price', label: 'SRP', kind: 'money' },
      { key: 'intro_date', label: 'Intro date' },
      { key: 'manufacturing_status', label: 'Status' },
    ],
  },
  {
    title: 'Performance',
    fields: [
      { key: 'speed_ppm', label: 'Speed (ppm)' },
      { key: 'first_copy_out_sec', label: 'First copy out (s)' },
    ],
  },
  {
    title: 'Scanner',
    fields: [
      { key: 'scan_speed_simplex_black', label: 'Scan simplex B/W' },
      { key: 'scan_speed_simplex_color', label: 'Scan simplex color' },
      { key: 'scan_speed_duplex_black', label: 'Scan duplex B/W' },
      { key: 'scan_speed_duplex_color', label: 'Scan duplex color' },
      { key: 'document_feeder', label: 'Document feeder' },
      { key: 'scanner_feeder_type', label: 'Feeder type' },
    ],
  },
  {
    title: 'Capabilities',
    fields: [
      { key: 'fax_capable', label: 'Fax', kind: 'bool' },
      { key: 'has_ethernet', label: 'Ethernet', kind: 'bool' },
      { key: 'has_wifi', label: 'Wi-Fi', kind: 'bool' },
      { key: 'has_nfc', label: 'NFC', kind: 'bool' },
      { key: 'network_interface_raw', label: 'Network interface' },
      { key: 'max_paper_size', label: 'Max paper size' },
    ],
  },
];

function fmt(value: unknown, kind?: FieldDef['kind']): string {
  if (kind === 'bool') return value === true ? 'Yes' : value === false ? 'No' : '—';
  if (value === null || value === undefined || value === '') return '—';
  if (kind === 'money') return `$${Number(value).toLocaleString()}`;
  return String(value);
}

// Cost per page in cents, from a sellable supply's price and yield.
function centsPerPage(price: number | null, yieldPages: number | null): string {
  if (!price || !yieldPages) return '—';
  return `${((price / yieldPages) * 100).toFixed(2)}¢`;
}

export default function DeviceDetail({ id, onClose }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDevice(id)
      .then(setDetail)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  const dev = detail?.device;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="my-8 w-full max-w-4xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {dev ? `${dev.manufacturer ?? ''} ${dev.model}`.trim() : 'Loading…'}
            </h2>
            {dev?.full_name != null && <p className="text-xs text-slate-500">{String(dev.full_name)}</p>}
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>

        {error ? (
          <p className="p-5 text-sm text-red-700">{error}</p>
        ) : !detail ? (
          <p className="p-5 text-sm text-slate-500">Loading device…</p>
        ) : (
          <div className="space-y-5 p-5">
            {detail.imageUrl && (
              <img src={detail.imageUrl} alt={dev!.model} className="h-32 rounded border border-slate-200 object-contain" />
            )}

            {/* First-class field groups */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {GROUPS.map((g) => (
                <div key={g.title} className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.title}</h3>
                  <dl className="space-y-1 text-sm">
                    {g.fields.map((f) => (
                      <div key={f.key} className="flex justify-between gap-3">
                        <dt className="text-slate-500">{f.label}</dt>
                        <dd className="text-right text-slate-800">{fmt(dev![f.key], f.kind)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            {/* Supplies with cost-per-page */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplies ({detail.supplies.length})
              </h3>
              {detail.supplies.length === 0 ? (
                <p className="text-sm text-slate-400">No supplies stored (A3 devices skip supplies).</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-1 pr-2 font-medium">Description</th>
                      <th className="pb-1 pr-2 font-medium">Part #</th>
                      <th className="pb-1 pr-2 font-medium">Color</th>
                      <th className="pb-1 pr-2 font-medium">Yield</th>
                      <th className="pb-1 pr-2 font-medium">Price</th>
                      <th className="pb-1 pr-2 font-medium">Cost/page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.supplies.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="py-1 pr-2">{s.description}</td>
                        <td className="py-1 pr-2">{s.part_number ?? '—'}</td>
                        <td className="py-1 pr-2">{s.color ?? '—'}</td>
                        <td className="py-1 pr-2">{s.yield_pages?.toLocaleString() ?? '—'}</td>
                        <td className="py-1 pr-2">{s.price != null ? `$${s.price}` : '—'}</td>
                        <td className="py-1 pr-2 font-medium text-slate-700">{centsPerPage(s.price, s.yield_pages)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* All other attributes, by section */}
            <details className="rounded-lg border border-slate-200 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                All attributes ({Object.values(detail.attributes).reduce((n, kv) => n + Object.keys(kv).length, 0)})
              </summary>
              <div className="mt-3 space-y-3">
                {Object.entries(detail.attributes).map(([section, kv]) => (
                  <div key={section}>
                    <p className="mb-1 text-xs font-semibold text-slate-600">{section}</p>
                    <div className="grid grid-cols-1 gap-x-4 text-xs md:grid-cols-2">
                      {Object.entries(kv).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-slate-50 py-0.5">
                          <span className="text-slate-400">{k}</span>
                          <span className="text-right text-slate-700">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
