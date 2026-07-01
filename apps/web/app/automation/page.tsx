'use client';

// AI Automation: pipeline brief → JSON spec → reel/post final.
// Content Creation "spill" prompt jadi JSON, lalu dari JSON dibuat reel/post-nya.

import { useEffect, useState } from 'react';
import { BrandSwitcher, type Brand } from '../../components/BrandSwitcher';
import { ModelSettings } from '../../components/ModelSettings';
import { Markdown } from '../../components/Markdown';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type LlmSettings } from '../../lib/llmSettings';

type Format = 'reels' | 'carousel' | 'post';
const FORMATS: { value: Format; label: string }[] = [
  { value: 'reels', label: 'Reels / TikTok' },
  { value: 'carousel', label: 'Carousel IG' },
  { value: 'post', label: 'Single Post' },
];

type Res = {
  format: Format;
  platform: string;
  spec?: unknown;
  output?: { readable?: string; json?: unknown };
  demo?: boolean;
};

export default function AutomationPage() {
  const [brand, setBrand] = useState<Brand>();
  const [brief, setBrief] = useState('');
  const [format, setFormat] = useState<Format>('reels');
  const [platform, setPlatform] = useState('');
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res>();

  useEffect(() => setSettings(loadSettings()), []);
  const provider = settings.provider;
  const hasKey = Boolean(settings.keys[provider]?.trim());

  async function run() {
    if (busy) return;
    if (!brief.trim()) {
      toast('Isi brief dulu', 'error');
      return;
    }
    setBusy(true);
    setRes(undefined);
    try {
      const r = await api.automate({
        brandId: brand?.id,
        brief,
        format,
        platform: platform || undefined,
        provider,
        apiKey: settings.keys[provider]?.trim() || undefined,
        model: settings.models[provider],
      });
      setRes(r);
      toast('Otomasi selesai');
    } catch (e) {
      toast(`Gagal: ${e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-line bg-brand-panel px-6 py-3">
        <h1 className="text-base font-semibold text-brand-text">AI Automation</h1>
        <div className="flex-1" />
        <span className="text-xs text-brand-muted">Brand:</span>
        <BrandSwitcher value={brand?.id} onChange={setBrand} />
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-5">
        {/* FORM */}
        <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
          <div className="flex items-start gap-2">
            <div>
              <h2 className="text-base font-semibold">Brief → JSON → Reel/Post</h2>
              <p className="mt-0.5 text-xs text-brand-muted">
                AI mengubah brief jadi <b>spec JSON</b>, lalu dari JSON itu membuat reel/post final.
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
              {hasKey ? `live · ${settings.models[provider]}` : 'mode demo'}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-brand-line px-2 py-1 text-xs hover:bg-white/5"
            >
              ⚙️
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-semibold">Format</label>
              <select
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                value={format}
                onChange={(e) => setFormat(e.target.value as Format)}
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold">Platform (opsional)</label>
              <input
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                placeholder="IG Reels / TikTok / Instagram"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[13px] font-semibold">Brief / arahan konten</label>
              <textarea
                className="min-h-[90px] w-full resize-y rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                placeholder='mis. "Promo bundling 2 serum 99k, angle before/after, target ibu muda, CTA checkout link bio"'
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={run}
            disabled={busy}
            className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
          >
            {busy ? 'Memproses…' : 'Jalankan otomasi'}
          </button>
        </div>

        {/* HASIL */}
        {res && (
          <>
            {/* Tahap 1: spec JSON */}
            <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="text-sm font-bold">1 · Prompt → JSON (spec)</div>
                {res.demo && (
                  <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-300">
                    mode demo
                  </span>
                )}
                <div className="flex-1" />
                {res.spec != null && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(JSON.stringify(res.spec, null, 2))}
                    className="rounded-lg border border-brand-line px-2.5 py-1 text-xs hover:bg-white/5"
                  >
                    Copy JSON
                  </button>
                )}
              </div>
              <pre className="max-h-[40vh] overflow-auto rounded-lg border border-brand-line bg-black/40 p-3 text-xs text-slate-100">
                {res.spec != null ? JSON.stringify(res.spec, null, 2) : '(spec JSON tidak terparse)'}
              </pre>
            </div>

            {/* Tahap 2: reel/post final */}
            <div className="rounded-xl border border-brand-accent/30 bg-brand-panel p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="text-sm font-bold">
                  2 · {FORMATS.find((f) => f.value === res.format)?.label} final
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => navigator.clipboard?.writeText(res.output?.readable ?? '')}
                  className="rounded-lg border border-brand-line px-2.5 py-1 text-xs hover:bg-white/5"
                >
                  Copy teks
                </button>
              </div>
              <div className="rounded-lg border border-brand-line bg-black/30 p-3">
                <Markdown>{res.output?.readable ?? '(kosong)'}</Markdown>
              </div>
              {res.output?.json != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-brand-muted">JSON produksi (untuk otomasi/API)</summary>
                  <pre className="mt-1 max-h-[40vh] overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-100">
                    {JSON.stringify(res.output.json, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </>
        )}
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
