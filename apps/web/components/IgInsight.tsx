'use client';

// IgInsight: alat AI fokus menggali INSIGHT dari akun kompetitor Instagram.
// Form (handle/niche/data) → LLM → hasil terstruktur dirender jadi kartu:
// content pillars, pola hook, format mix, cadence, engagement, SWOT, celah, plays.

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { ModelSettings } from './ModelSettings';
import { Markdown } from './Markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type LlmSettings } from '../lib/llmSettings';

type Hook = { hook?: string; why_works?: string };
type FormatShare = { format?: string; share?: string };
type Account = {
  handle?: string;
  niche_fit?: string;
  positioning?: string;
  est_followers?: string;
  note?: string;
};
type Play = { play?: string; rationale?: string };
type IgJson = {
  accounts?: Account[];
  content_pillars?: string[];
  top_hooks?: Hook[];
  format_mix?: FormatShare[];
  posting_cadence?: string;
  engagement_drivers?: string[];
  strengths?: string[];
  weaknesses?: string[];
  gaps_to_exploit?: string[];
  recommended_plays?: Play[];
};

export function IgInsight({ brandId }: { brandId?: string }) {
  const [handles, setHandles] = useState('');
  const [niche, setNiche] = useState('');
  const [pasted, setPasted] = useState('');
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ json?: IgJson; text: string; demo?: boolean; liveData?: boolean }>();

  useEffect(() => setSettings(loadSettings()), []);
  const provider = settings.provider;
  const hasKey = Boolean(settings.keys[provider]?.trim());

  async function run() {
    if (busy) return;
    if (!handles.trim() && !pasted.trim() && !niche.trim()) {
      toast('Isi minimal handle kompetitor, niche, atau tempel datanya', 'error');
      return;
    }
    setBusy(true);
    setRes(undefined);
    try {
      const r = await api.insight({
        type: 'ig_insight',
        brandId,
        params: { handles, niche, pasted },
        provider,
        apiKey: settings.keys[provider]?.trim() || undefined,
        model: settings.models[provider],
      });
      setRes({ json: r.json ?? undefined, text: r.text, demo: r.demo, liveData: r.liveData });
      toast('Insight kompetitor selesai');
    } catch (e) {
      toast(`Gagal: ${e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  const j = res?.json;

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-base font-semibold">Insight Kompetitor Instagram</h2>
            <p className="mt-0.5 text-xs text-brand-muted">
              Analisis akun kompetitor: pola hook, format, cadence, pendorong engagement, dan celah yang bisa direbut.
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[13px] font-semibold">Handle kompetitor IG (pisah koma)</label>
            <input
              className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
              placeholder="@kompetitor1, @kompetitor2, @kompetitor3"
              value={handles}
              onChange={(e) => setHandles(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[13px] font-semibold">Niche / kategori (opsional)</label>
            <input
              className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
              placeholder="mis. skincare lokal, kopi specialty"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[13px] font-semibold">
              Tempel data kompetitor (opsional — dipakai bila data live belum aktif)
            </label>
            <textarea
              className="min-h-[90px] w-full resize-y rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
              placeholder="bio, caption, hook reels, jumlah likes/komentar, dll"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={run}
          disabled={busy}
          className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
        >
          {busy ? 'Menganalisis…' : 'Gali insight'}
        </button>
      </div>

      {/* Hasil */}
      {res && (
        <>
          <div className="flex items-center gap-2">
            {res.demo && (
              <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-300">
                mode demo
              </span>
            )}
            <span className="rounded-full border border-brand-line px-2 py-0.5 text-[11px] text-brand-muted">
              {res.liveData ? 'data live' : 'tanpa data live (analisis dari input/pengetahuan AI)'}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => navigator.clipboard?.writeText(res.text)}
              className="rounded-lg border border-brand-line px-2.5 py-1 text-xs hover:bg-white/5"
            >
              Copy teks
            </button>
          </div>

          {j ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {!!j.accounts?.length && (
                <Card title="Akun dianalisis" full>
                  <div className="space-y-2">
                    {j.accounts.map((a, i) => (
                      <div key={i} className="rounded-lg border border-brand-line bg-brand-bg p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-brand-accent">{a.handle || '—'}</span>
                          {a.est_followers && (
                            <span className="text-xs text-brand-muted">· {a.est_followers} followers</span>
                          )}
                        </div>
                        {a.positioning && <p className="mt-1 text-sm text-brand-text">{a.positioning}</p>}
                        {(a.niche_fit || a.note) && (
                          <p className="mt-0.5 text-xs text-brand-muted">{[a.niche_fit, a.note].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {!!j.content_pillars?.length && (
                <Card title="Content pillars">
                  <Chips items={j.content_pillars} />
                </Card>
              )}
              {!!j.format_mix?.length && (
                <Card title="Format mix">
                  <ul className="space-y-1 text-sm">
                    {j.format_mix.map((f, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>{f.format}</span>
                        <span className="text-brand-muted">{f.share}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {!!j.top_hooks?.length && (
                <Card title="Pola hook yang menang" full>
                  <ul className="space-y-2">
                    {j.top_hooks.map((h, i) => (
                      <li key={i} className="rounded-lg border border-brand-line bg-brand-bg p-2.5">
                        <div className="text-sm font-medium text-brand-text">“{h.hook}”</div>
                        {h.why_works && <div className="mt-0.5 text-xs text-brand-muted">{h.why_works}</div>}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {j.posting_cadence && (
                <Card title="Pola posting">
                  <p className="text-sm">{j.posting_cadence}</p>
                </Card>
              )}
              {!!j.engagement_drivers?.length && (
                <Card title="Pendorong engagement">
                  <Bullets items={j.engagement_drivers} />
                </Card>
              )}
              {!!j.strengths?.length && (
                <Card title="Kekuatan">
                  <Bullets items={j.strengths} tone="success" />
                </Card>
              )}
              {!!j.weaknesses?.length && (
                <Card title="Kelemahan">
                  <Bullets items={j.weaknesses} tone="danger" />
                </Card>
              )}
              {!!j.gaps_to_exploit?.length && (
                <Card title="Celah yang bisa direbut" full>
                  <Bullets items={j.gaps_to_exploit} tone="accent" />
                </Card>
              )}
              {!!j.recommended_plays?.length && (
                <Card title="Rekomendasi langkah (plays)" full>
                  <ul className="space-y-2">
                    {j.recommended_plays.map((p, i) => (
                      <li key={i} className="rounded-lg border border-brand-line bg-brand-bg p-2.5">
                        <div className="text-sm font-medium text-brand-text">{p.play}</div>
                        {p.rationale && <div className="mt-0.5 text-xs text-brand-muted">{p.rationale}</div>}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          ) : (
            // Fallback: JSON tidak terparse → render teks sebagai Markdown.
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-brand-line bg-brand-panel p-4">
              <Markdown>{res.text}</Markdown>
            </div>
          )}
        </>
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

function Card({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`rounded-xl border border-brand-line bg-brand-panel p-4 ${full ? 'sm:col-span-2' : ''}`}>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-muted">{title}</div>
      {children}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2 py-0.5 text-xs text-brand-accent">
          {it}
        </span>
      ))}
    </div>
  );
}

function Bullets({ items, tone }: { items: string[]; tone?: 'success' | 'danger' | 'accent' }) {
  const dot =
    tone === 'success' ? 'text-brand-success' : tone === 'danger' ? 'text-brand-danger' : tone === 'accent' ? 'text-brand-accent' : 'text-brand-muted';
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-brand-text">
          <span className={`mt-0.5 ${dot}`}>▸</span>
          {it}
        </li>
      ))}
    </ul>
  );
}
