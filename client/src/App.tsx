import { useState } from 'react';
import SpecInput from './components/SpecInput';
import ReviewScreen from './components/ReviewScreen';
import CatalogScreen from './components/CatalogScreen';
import { parseDevice } from './api';
import type { ParseResult } from './types';

type Screen = 'input' | 'review';
type View = 'add' | 'catalog';

export default function App() {
  const [view, setView] = useState<View>('add');
  const [screen, setScreen] = useState<Screen>('input');
  const [rawText, setRawText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; updated: boolean } | null>(null);
  // Bump to force the catalog to refetch after a save.
  const [catalogKey, setCatalogKey] = useState(0);

  async function handleParse() {
    setParsing(true);
    setError(null);
    try {
      const res = await parseDevice(rawText);
      setResult(res);
      setScreen('review');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  function reset() {
    setScreen('input');
    setRawText('');
    setImage(null);
    setResult(null);
    setSaved(null);
  }

  const tab = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        view === v ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">uStack Device Catalog</h1>
            <p className="text-xs text-slate-500">Paste a spec sheet → review → save to the catalog</p>
          </div>
          <nav className="flex items-center gap-1 rounded-lg bg-slate-50 p-1">
            {tab('add', 'Add Device')}
            {tab('catalog', 'Catalog')}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {view === 'catalog' ? (
          <CatalogScreen key={catalogKey} />
        ) : saved ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-center">
            <p className="text-lg font-medium text-green-900">
              Device {saved.updated ? 'updated' : 'saved'} ✓
            </p>
            <p className="mt-1 text-sm text-green-700">Catalog id: {saved.id}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={reset} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                Add another device
              </button>
              <button
                onClick={() => {
                  setCatalogKey((k) => k + 1);
                  setView('catalog');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                View catalog
              </button>
            </div>
          </div>
        ) : screen === 'input' ? (
          <SpecInput
            rawText={rawText}
            setRawText={setRawText}
            image={image}
            setImage={setImage}
            onParse={handleParse}
            parsing={parsing}
            error={error}
          />
        ) : (
          result && (
            <ReviewScreen
              result={result}
              image={image}
              onBack={() => setScreen('input')}
              onSaved={(id, updated) => {
                setSaved({ id, updated });
                setCatalogKey((k) => k + 1);
              }}
            />
          )
        )}
      </main>
    </div>
  );
}
