'use client';

// AI Automation (mode GAMBAR): brief → AI susun BEBERAPA konsep → OpenAI Images →
// beberapa gambar. Output berupa IMAGE (bukan script). Butuh OpenAI API key (image
// gen hanya via OpenAI); tanpa key → tampilkan prompt-nya saja (mode demo).

import { useEffect, useState } from 'react';
import { BrandSwitcher, type Brand } from '../../components/BrandSwitcher';
import { ModelSettings } from '../../components/ModelSettings';
import { AutomationHistory } from '../../components/AutomationHistory';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type LlmSettings } from '../../lib/llmSettings';

type Aspect = 'square' | 'portrait' | 'landscape';
const ASPECTS: { value: Aspect; label: string }[] = [
  { value: 'square', label: 'Kotak 1:1 (feed)' },
  { value: 'portrait', label: 'Potret 4:5 / 9:16 (story/reels)' },
  { value: 'landscape', label: 'Lanskap 16:9' },
];

// Satu gambar hasil (satu konsep).
type ImageItem = {
  imagePrompt?: string;
  caption?: string;
  hashtags?: string[];
  image?: string | null; // data URL base64
  size?: string;
  model?: string;
  error?: string;
};
type Res = { aspect?: Aspect; count?: number; demo?: boolean; results?: ImageItem[] };

export default function AutomationPage() {
  const [brand, setBrand] = useState<Brand>();
  const [brief, setBrief] = useState('');
  const [aspect, setAspect] = useState<Aspect>('square');
  const [count, setCount] = useState(3); // jumlah gambar
  const [style, setStyle] = useState('');
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res>();
  const [historyKey, setHistoryKey] = useState(0); // pemicu refresh riwayat

  useEffect(() => setSettings(loadSettings()), []);
  // Image gen HANYA via OpenAI → yang relevan adalah OpenAI key.
  const openaiKey = settings.keys.openai?.trim();
  const hasKey = Boolean(openaiKey);

  // Kirim brief ke backend → dapat beberapa gambar + caption + prompt.
  async function run() {
    if (busy) return;
    if (!brief.trim()) {
      toast('Isi brief/arahan visual dulu', 'error');
      return;
    }
    setBusy(true);
    setRes(undefined);
    try {
      const r = await api.automateImage({
        brandId: brand?.id,
        brief,
        count,
        aspect,
        style: style || undefined,
        apiKey: openaiKey || undefined,
      });
      setRes(r);
      setHistoryKey((k) => k + 1); // segarkan riwayat setelah tersimpan
      const made = (r.results ?? []).filter((x: ImageItem) => x.image).length;
      toast(made ? `${made} gambar selesai` : 'Prompt gambar siap (mode demo)');
    } catch (e) {
      toast(`Gagal: ${e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  // Unduh satu gambar (data URL base64) sebagai file PNG.
  function downloadImage(dataUrl: string, idx: number) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `automation-${aspect}-${idx + 1}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const results = res?.results ?? [];

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-line bg-brand-panel px-6 py-3">
        <h1 className="text-base font-semibold text-brand-text">AI Automation · Gambar</h1>
        <div className="flex-1" />
        <span className="text-xs text-brand-muted">Brand:</span>
        <BrandSwitcher value={brand?.id} onChange={setBrand} />
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-5">
        {/* FORM */}
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <div className="flex items-start gap-2">
            <div>
              <h2 className="text-base font-semibold">Brief → Beberapa Gambar</h2>
              <p className="mt-0.5 text-xs text-brand-muted">
                AI menyusun beberapa konsep visual dari brief-mu, lalu menggenerate <b>gambar</b> (via OpenAI Images).
              </p>
            </div>
            <div className="flex-1" />
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                hasKey
                  ? 'border-brand-success/40 bg-brand-success/10 text-brand-success'
                  : 'border-orange-400/30 bg-orange-400/10 text-orange-300'
              }`}
            >
              {hasKey ? 'live · OpenAI' : 'mode demo (isi OpenAI key)'}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-brand-line px-2 py-1 text-xs hover:bg-white/5"
            >
              ⚙️
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[13px] font-semibold">Rasio gambar</label>
              <select
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                value={aspect}
                onChange={(e) => setAspect(e.target.value as Aspect)}
              >
                {ASPECTS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold">Jumlah gambar</label>
              <select
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n} gambar</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold">Gaya visual (opsional)</label>
              <input
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                placeholder="mis. fotografi produk, flat vector, 3D"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-[13px] font-semibold">Brief / arahan visual</label>
              <textarea
                className="min-h-[90px] w-full resize-y rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                placeholder='mis. "Poster promo bundling 2 serum, nuansa pastel, ada teks 99K, mood cerah higienis"'
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>
          </div>

          {!hasKey && (
            <p className="mt-2 text-xs text-orange-300">
              Generate gambar butuh <b>OpenAI API key</b>. Isi di ⚙️ (key OpenAI). Tanpa key, hanya prompt gambar yang ditampilkan.
            </p>
          )}

          <button
            onClick={run}
            disabled={busy}
            className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
          >
            {busy ? `Menggenerate ${count} gambar…` : `Generate ${count} gambar`}
          </button>
        </div>

        {/* HASIL: grid beberapa gambar */}
        {res && (
          <div className="space-y-2">
            {res.demo && (
              <span className="inline-block rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-300">
                mode demo (tanpa OpenAI key) — hanya prompt
              </span>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((item, i) => (
                <div key={i} className="rounded-xl border border-brand-accent/30 bg-brand-panel p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="text-sm font-bold">Gambar {i + 1}</div>
                    {item.model && item.image && (
                      <span className="text-[11px] text-brand-muted">{item.model} · {item.size}</span>
                    )}
                    <div className="flex-1" />
                    {item.image && (
                      <button
                        onClick={() => downloadImage(item.image as string, i)}
                        className="rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-1 text-xs text-brand-accent hover:bg-brand-accent/20"
                      >
                        ⬇ PNG
                      </button>
                    )}
                  </div>

                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={`Hasil ${i + 1}`}
                      className="w-full rounded-lg border border-brand-line"
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-brand-line bg-brand-bg p-4 text-center text-xs text-brand-muted">
                      {item.error ? `Gagal: ${item.error}` : 'Belum ada gambar (mode demo).'}
                    </div>
                  )}

                  {item.caption && (
                    <div className="mt-2 rounded-lg border border-brand-line bg-brand-bg p-2.5">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Caption</span>
                        <div className="flex-1" />
                        <button
                          onClick={() =>
                            navigator.clipboard?.writeText(
                              [item.caption, (item.hashtags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')]
                                .filter(Boolean)
                                .join('\n\n'),
                            )
                          }
                          className="rounded-lg border border-brand-line px-2 py-0.5 text-[11px] hover:bg-white/5"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-brand-text">{item.caption}</p>
                      {!!item.hashtags?.length && (
                        <p className="mt-1 text-[11px] text-brand-accent">
                          {item.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                        </p>
                      )}
                    </div>
                  )}

                  {item.imagePrompt && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-brand-muted">Prompt gambar</summary>
                      <p className="mt-1 text-[11px] text-slate-300">{item.imagePrompt}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riwayat generasi gambar (tersimpan di server) */}
        <AutomationHistory brandId={brand?.id} refreshKey={historyKey} />
      </div>

      {showSettings && (
        <ModelSettings
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(s) => {
            setSettings(s);
            saveSettings(s);
            setShowSettings(false);
          }}
        />
      )}
    </>
  );
}
