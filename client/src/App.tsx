import { useState } from 'react';
import SpecInput from './components/SpecInput';
import ReviewScreen from './components/ReviewScreen';
import { parseDevice } from './api';
import type { ParseResult } from './types';

type Screen = 'input' | 'review';

export default function App() {
  const [screen, setScreen] = useState<Screen>('input');
  const [rawText, setRawText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; updated: boolean } | null>(null);

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

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">uStack Device Catalog</h1>
            <p className="text-xs text-slate-500">Paste a spec sheet → review → save to the catalog</p>
          </div>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">MVP</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {saved ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-center">
            <p className="text-lg font-medium text-green-900">
              Device {saved.updated ? 'updated' : 'saved'} ✓
            </p>
            <p className="mt-1 text-sm text-green-700">Catalog id: {saved.id}</p>
            <button onClick={reset} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Add another device
            </button>
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
              onSaved={(id, updated) => setSaved({ id, updated })}
            />
          )
        )}
      </main>
    </div>
  );
}
