import { useCallback, useRef, useState } from 'react';

interface Props {
  rawText: string;
  setRawText: (v: string) => void;
  image: string | null; // data URL
  setImage: (v: string | null) => void;
  onParse: () => void;
  parsing: boolean;
  error: string | null;
}

export default function SpecInput({
  rawText,
  setRawText,
  image,
  setImage,
  onParse,
  parsing,
  error,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    },
    [setImage],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) readFile(file);
    },
    [readFile],
  );

  const lineCount = rawText ? rawText.split('\n').length : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Device spec text</label>
          <span className="text-xs text-slate-400">{lineCount.toLocaleString()} lines</span>
        </div>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the full spec page from BLI, a manufacturer sheet, a PDF export, or a website. The parser strips the UI chrome automatically."
          spellCheck={false}
          className="h-[420px] w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Device image <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-4 transition ${
            dragging ? 'border-brand bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
        >
          {image ? (
            <div className="flex items-center gap-4">
              <img src={image} alt="preview" className="h-20 w-20 rounded object-contain" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImage(null);
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Drag & drop an image here, or <span className="text-brand">browse</span>
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
            }}
          />
        </div>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={onParse}
        disabled={parsing || rawText.trim() === ''}
        className="w-full rounded-lg bg-brand px-4 py-3 font-medium text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {parsing ? 'Parsing…' : 'Parse device'}
      </button>
    </div>
  );
}
