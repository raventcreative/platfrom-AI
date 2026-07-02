'use client';

// InsightTool: alat insight generik (form → LLM → hasil). Dipakai untuk
// cari kompetitor, audit IG, inspirasi konten, dan education insight.
// Mengambil setting LLM (provider/API key/model) dari localStorage bersama.

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { downloadHtmlPdf } from '../lib/pdf';
import { ModelSettings } from './ModelSettings';
import { Markdown } from './Markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type LlmSettings } from '../lib/llmSettings';

export type ToolField = {
  id: string;
  label: string;
  type?: 'text' | 'textarea';
  placeholder?: string;
  hint?: string;
};

type InsightType =
  | 'competitor'
  | 'ig_audit'
  | 'inspiration'
  | 'education'
  | 'content_intel';

export function InsightTool({
  type,
  title,
  description,
  fields,
  runLabel = 'Jalankan',
  brandId,
}: {
  type: InsightType;
  title: string;
  description: string;
  fields: ToolField[];
  runLabel?: string;
  brandId?: string;
}) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<{ text: string; demo?: boolean; liveData?: boolean }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => setSettings(loadSettings()), []);

  const provider = settings.provider;
  const hasKey = Boolean(settings.keys[provider]?.trim());

  async function run() {
    if (busy) return;
    setBusy(true);
    setResult(undefined);
    try {
      const res = await api.insight({
        type,
        brandId,
        params,
        provider,
        apiKey: settings.keys[provider]?.trim() || undefined,
        model: settings.models[provider],
      });
      setResult({ text: res.text, demo: res.demo, liveData: res.liveData });
      toast(`${title} selesai`);
    } catch (e) {
      toast(`${title} gagal: ${e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
      <div className="flex items-start gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-brand-muted">{description}</p>
        </div>
        <div className="flex-1" />
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            hasKey
              ? 'border-green-400/30 bg-green-400/10 text-green-300'
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

      <div className="mt-3 space-y-3">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="mb-1 block text-[13px] font-semibold text-brand-text">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                className="min-h-[80px] w-full resize-y rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                placeholder={f.placeholder}
                value={params[f.id] ?? ''}
                onChange={(e) => setParams((s) => ({ ...s, [f.id]: e.target.value }))}
              />
            ) : (
              <input
                className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
                placeholder={f.placeholder}
                value={params[f.id] ?? ''}
                onChange={(e) => setParams((s) => ({ ...s, [f.id]: e.target.value }))}
              />
            )}
            {f.hint && <p className="mt-1 text-xs text-brand-muted">{f.hint}</p>}
          </div>
        ))}
      </div>

      <button
        onClick={run}
        disabled={busy}
        className="mt-3 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
      >
        {busy ? 'Memproses…' : runLabel}
      </button>

      {result && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2">
            {result.demo && (
              <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-300">
                mode demo
              </span>
            )}
            {(type === 'ig_audit' || type === 'content_intel') && (
              <span className="rounded-full border border-brand-line px-2 py-0.5 text-[11px] text-brand-muted">
                {result.liveData ? 'data live' : 'tanpa data live (analisis dari input/pengetahuan AI)'}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => {
                const el = document.getElementById(`insight-md-${type}`);
                if (el) downloadHtmlPdf(el.innerHTML, title.replace(/[^\w]+/g, '-'), title);
              }}
              className="rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-1 text-xs text-brand-accent hover:bg-brand-accent/20"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(result.text)}
              className="rounded-lg border border-brand-line px-2.5 py-1 text-xs hover:bg-white/5"
            >
              Copy
            </button>
          </div>
          <div
            id={`insight-md-${type}`}
            className="max-h-[60vh] overflow-auto rounded-lg border border-brand-line bg-black/30 p-3"
          >
            <Markdown>{result.text}</Markdown>
          </div>
        </div>
      )}

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
    </div>
  );
}
