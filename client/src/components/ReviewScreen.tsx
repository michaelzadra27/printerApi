import { useState } from 'react';
import type { ParseResult, ParsedDevice, ParsedSupply } from '../types';
import { saveDevice } from '../api';

interface Props {
  result: ParseResult;
  image: string | null;
  onBack: () => void;
  onSaved: (id: string, updated: boolean) => void;
}

type FieldKind = 'text' | 'number' | 'bool' | 'class';
interface FieldDef {
  key: keyof ParsedDevice;
  label: string;
  kind: FieldKind;
}

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Identity',
    fields: [
      { key: 'manufacturer', label: 'Manufacturer', kind: 'text' },
      { key: 'model', label: 'Model', kind: 'text' },
      { key: 'fullName', label: 'Full name', kind: 'text' },
      { key: 'deviceClass', label: 'Class', kind: 'class' },
      { key: 'colorCapability', label: 'Color', kind: 'text' },
      { key: 'technology', label: 'Technology', kind: 'text' },
    ],
  },
  {
    title: 'Pricing & Lifecycle',
    fields: [
      { key: 'partNumber', label: 'Part #', kind: 'text' },
      { key: 'streetPrice', label: 'Street price', kind: 'number' },
      { key: 'srpPrice', label: 'SRP', kind: 'number' },
      { key: 'introDate', label: 'Intro date', kind: 'text' },
      { key: 'manufacturingStatus', label: 'Status', kind: 'text' },
    ],
  },
  {
    title: 'Performance',
    fields: [
      { key: 'speedPpm', label: 'Speed (ppm)', kind: 'number' },
      { key: 'firstCopyOutSec', label: 'First copy out (s)', kind: 'number' },
    ],
  },
  {
    title: 'Scanner',
    fields: [
      { key: 'scanSpeedSimplexBlack', label: 'Simplex B/W (ipm)', kind: 'number' },
      { key: 'scanSpeedSimplexColor', label: 'Simplex color (ipm)', kind: 'number' },
      { key: 'scanSpeedDuplexBlack', label: 'Duplex B/W (ipm)', kind: 'number' },
      { key: 'scanSpeedDuplexColor', label: 'Duplex color (ipm)', kind: 'number' },
      { key: 'documentFeeder', label: 'Document feeder', kind: 'text' },
      { key: 'scannerFeederType', label: 'Feeder type', kind: 'text' },
    ],
  },
  {
    title: 'Capabilities',
    fields: [
      { key: 'faxCapable', label: 'Fax', kind: 'bool' },
      { key: 'hasEthernet', label: 'Ethernet', kind: 'bool' },
      { key: 'hasWifi', label: 'Wi-Fi', kind: 'bool' },
      { key: 'hasNfc', label: 'NFC', kind: 'bool' },
      { key: 'networkInterfaceRaw', label: 'Network interface', kind: 'text' },
      { key: 'maxPaperSize', label: 'Max paper size', kind: 'text' },
    ],
  },
];

const CLASSES = ['printer', 'mfp', 'copier', 'scanner', 'production', 'fax', 'unknown'];

export default function ReviewScreen({ result, image, onBack, onSaved }: Props) {
  const [device, setDevice] = useState<ParsedDevice>(result.device);
  const [supplies, setSupplies] = useState<ParsedSupply[]>(result.supplies);
  const [attributes, setAttributes] = useState(result.attributes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [showAttrs, setShowAttrs] = useState(false);

  const setField = (key: keyof ParsedDevice, value: unknown) =>
    setDevice((d) => ({ ...d, [key]: value }));

  const setSupply = (i: number, key: keyof ParsedSupply, value: unknown) =>
    setSupplies((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const setAttr = (section: string, key: string, value: string) =>
    setAttributes((a) => ({ ...a, [section]: { ...a[section], [key]: value } }));

  async function doSave(overwrite: boolean) {
    setSaving(true);
    setError(null);
    setDuplicate(null);
    try {
      const { status, body } = await saveDevice({
        device,
        supplies,
        attributes,
        rawText: result.rawText,
        confidence: result.confidence,
        imageBase64: image ?? undefined,
        overwrite,
      });
      if (status === 409) {
        setDuplicate(body.existingId ?? 'unknown');
      } else if (status >= 400) {
        setError(body.error === 'duplicate' ? body.message ?? 'Duplicate' : body.error ?? `Save failed (${status})`);
      } else if (body.id) {
        onSaved(body.id, Boolean(body.updated));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const pct = Math.round(result.confidence * 100);
  const confColor = pct >= 90 ? 'bg-green-100 text-green-800' : pct >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to paste
        </button>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${confColor}`}>
          Parser confidence {pct}%
        </span>
      </div>

      {/* First-class field groups */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.fields.map((f) => (
                <Field
                  key={String(f.key)}
                  def={f}
                  value={device[f.key]}
                  onChange={(v) => setField(f.key, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Supplies */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sellable supplies ({supplies.length})
        </h3>
        {supplies.length === 0 ? (
          <p className="text-sm text-slate-400">No priced supplies parsed.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-1 pr-2 font-medium">Description</th>
                  <th className="pb-1 pr-2 font-medium">Part #</th>
                  <th className="pb-1 pr-2 font-medium">Color</th>
                  <th className="pb-1 pr-2 font-medium">Yield</th>
                  <th className="pb-1 pr-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1 pr-2">
                      <input className="w-56 rounded border-slate-200 bg-transparent px-1 py-0.5" value={s.description} onChange={(e) => setSupply(i, 'description', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className="w-20 rounded border-slate-200 bg-transparent px-1 py-0.5" value={s.partNumber ?? ''} onChange={(e) => setSupply(i, 'partNumber', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">{s.color ?? '—'}</td>
                    <td className="py-1 pr-2">
                      <input type="number" className="w-16 rounded border-slate-200 bg-transparent px-1 py-0.5" value={s.yieldPages ?? ''} onChange={(e) => setSupply(i, 'yieldPages', e.target.value === '' ? null : Number(e.target.value))} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" step="0.01" className="w-20 rounded border-slate-200 bg-transparent px-1 py-0.5" value={s.price ?? ''} onChange={(e) => setSupply(i, 'price', e.target.value === '' ? null : Number(e.target.value))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attributes (collapsible) */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <button onClick={() => setShowAttrs((s) => !s)} className="flex w-full items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Additional attributes ({result.unmappedKeys.length})
          </h3>
          <span className="text-slate-400">{showAttrs ? '▾' : '▸'}</span>
        </button>
        {showAttrs && (
          <div className="mt-3 space-y-4">
            {Object.entries(attributes).map(([section, kv]) => (
              <div key={section}>
                <p className="mb-1 text-xs font-semibold text-slate-600">{section}</p>
                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                  {Object.entries(kv).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 text-xs">
                      <span className="w-40 shrink-0 truncate text-slate-400" title={k}>{k}</span>
                      <input className="flex-1 rounded border border-slate-200 px-1 py-0.5" value={v} onChange={(e) => setAttr(section, k, e.target.value)} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {duplicate && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">This device already exists in the catalog.</p>
          <p className="mt-1 text-amber-800">Update the existing record with these values, or go back and rename the model.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => doSave(true)} disabled={saving} className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
              Update existing
            </button>
            <button onClick={() => setDuplicate(null)} className="rounded border border-amber-300 px-3 py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onBack} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Cancel
        </button>
        <button onClick={() => doSave(false)} disabled={saving || !device.model} className="rounded-lg bg-brand px-5 py-2 font-medium text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
          {saving ? 'Saving…' : 'Save to catalog'}
        </button>
      </div>
    </div>
  );
}

function Field({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 text-slate-500">{def.label}</span>
      {def.kind === 'class' ? (
        <select className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm" value={String(value ?? 'unknown')} onChange={(e) => onChange(e.target.value)}>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      ) : def.kind === 'bool' ? (
        <select
          className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
          value={value === true ? 'yes' : value === false ? 'no' : 'unknown'}
          onChange={(e) => onChange(e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
        >
          <option value="unknown">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      ) : (
        <input
          type={def.kind === 'number' ? 'number' : 'text'}
          step="0.01"
          className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) =>
            onChange(def.kind === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)
          }
        />
      )}
    </label>
  );
}
