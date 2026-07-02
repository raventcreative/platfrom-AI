'use client';

// IgResearch: satu form untuk akun IG milik user →
//   (1) review akun saya, (2) temukan kompetitor, (3) riset kompetitor,
//   (4) rencana aksi. Output terstruktur dirender jadi kartu.

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { ModelSettings } from './ModelSettings';
import { Markdown } from './Markdown';
import { downloadHtmlPdf } from '../lib/pdf';
import { researchToHtml } from '../lib/igReport';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type LlmSettings } from '../lib/llmSettings';

type Hook = { hook?: string; why_works?: string };
type FormatShare = { format?: string; share?: string };
type Competitor = {
  handle?: string;
  why?: string;
  positioning?: string;
  est_followers?: string;
  gap_to_exploit?: string;
};
type Play = { play?: string; rationale?: string };
type ResearchJson = {
  my_account?: {
    handle?: string;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    content_pillars?: string[];
    recommendations?: string[];
  };
  competitors?: Competitor[];
  competitor_research?: {
    winning_hooks?: Hook[];
    format_mix?: FormatShare[];
    content_pillars?: string[];
    posting_cadence?: string;
    engagement_drivers?: string[];
  };
  action_plan?: Play[];
};

export function IgResearch({ brandId }: { brandId?: string }) {
  const [myHandle, setMyHandle] = useState('');
  const [niche, setNiche] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [pasted, setPasted] = useState('');
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ json?: ResearchJson; text: string; demo?: boolean; liveData?: boolean }>();

  useEffect(() => setSettings(loadSettings()), []);
  const provider = settings.provider;
  const hasKey = Boolean(settings.keys[provider]?.trim());

  async function run() {
    if (busy) return;
    if (!myHandle.trim() && !pasted.trim() && !niche.trim()) {
      toast('Isi minimal handle IG kamu (atau niche/data)', 'error');
      return;
    }
    setBusy(true);
    setRes(undefined);
    try {
      const r = await api.insight({
        type: 'ig_research',
        brandId,
        params: { myHandle, niche, competitors, pasted },
        provider,
        apiKey: settings.keys[provider]?.trim() || undefined,
        model: settings.models[provider],
      });
      setRes({ json: r.json ?? undefined, text: r.text, demo: r.demo, liveData: r.liveData });
      toast('Riset selesai');
    } catch (e) {
      toast(`Gagal: ${e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  const j = res?.json;
  const mine = j?.my_account;
  const cr = j?.competitor_research;

  return (
    <div className="space-y-4">
      {/* FORM tunggal */}
      <div className="rounded-xl border border-brand-line bg-brand-panel p-5">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-base font-semibold">Riset Instagram: Akun Saya + Kompetitor</h2>
            <p className="mt-0.5 text-xs text-brand-muted">
              Masukkan IG kamu → review akunmu, temukan kompetitor, riset pola kontennya, dan rencana aksi — sekaligus.
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
            <label className="mb-1 block text-[13px] font-semibold">Instagram saya</label>
            <input
              className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
              placeholder="@akun_saya"
              value={myHandle}
              onChange={(e) => setMyHandle(e.target.value)}
            />
          </div>
          <div>
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
              Kompetitor yang sudah kamu tahu (opsional, pisah koma)
            </label>
            <input
              className="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
              placeholder="@kompetitor1, @kompetitor2 — kosongkan biar AI carikan"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[13px] font-semibold">
              Tempel data (opsional — dipakai bila data live belum aktif)
            </label>
            <textarea
              className="min-h-[80px] w-full resize-y rounded-lg border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-accent"
              placeholder="bio/caption/contoh konten akunmu & kompetitor, jumlah followers/likes, dll"
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
          {busy ? 'Meriset…' : 'Riset sekarang'}
        </button>
      </div>

      {/* HASIL */}
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
            {j && (
              <button
                onClick={() =>
                  downloadHtmlPdf(researchToHtml(j), 'Riset-Instagram', 'Riset Instagram: Akun Saya + Kompetitor')
                }
                className="rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-1 text-xs text-brand-accent hover:bg-brand-accent/20"
              >
                ⬇ Download PDF
              </button>
            )}
            <button
              onClick={() => navigator.clipboard?.writeText(res.text)}
              className="rounded-lg border border-brand-line px-2.5 py-1 text-xs hover:bg-white/5"
            >
              Copy teks
            </button>
          </div>

          {j ? (
            <div className="space-y-4">
              {/* 1. Review akun saya */}
              {mine && (
                <Section title="1 · Review akun saya" accent>
                  {mine.handle && <div className="mb-1 font-semibold text-brand-accent">{mine.handle}</div>}
                  {mine.summary && <p className="mb-2 text-sm">{mine.summary}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {!!mine.strengths?.length && <MiniList title="Kekuatan" items={mine.strengths} tone="success" />}
                    {!!mine.weaknesses?.length && <MiniList title="Kelemahan" items={mine.weaknesses} tone="danger" />}
                    {!!mine.opportunities?.length && <MiniList title="Peluang" items={mine.opportunities} tone="accent" />}
                    {!!mine.content_pillars?.length && (
                      <div>
                        <MiniTitle>Content pillars</MiniTitle>
                        <Chips items={mine.content_pillars} />
                      </div>
                    )}
                  </div>
                  {!!mine.recommendations?.length && (
                    <div className="mt-3">
                      <MiniTitle>Rekomendasi</MiniTitle>
                      <Bullets items={mine.recommendations} tone="accent" />
                    </div>
                  )}
                </Section>
              )}

              {/* 2. Kompetitor ditemukan */}
              {!!j.competitors?.length && (
                <Section title="2 · Kompetitor ditemukan">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {j.competitors.map((c, i) => (
                      <div key={i} className="rounded-lg border border-brand-line bg-brand-bg p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-brand-accent">{c.handle || '—'}</span>
                          {c.est_followers && <span className="text-xs text-brand-muted">· {c.est_followers}</span>}
                        </div>
                        {c.positioning && <p className="mt-1 text-sm">{c.positioning}</p>}
                        {c.why && <p className="mt-0.5 text-xs text-brand-muted">{c.why}</p>}
                        {c.gap_to_exploit && (
                          <p className="mt-1 text-xs text-brand-accent">Celah: {c.gap_to_exploit}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* 3. Riset kompetitor */}
              {cr && (
                <Section title="3 · Riset pola konten kompetitor">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {!!cr.winning_hooks?.length && (
                      <div className="sm:col-span-2">
                        <MiniTitle>Hook yang menang</MiniTitle>
                        <ul className="space-y-2">
                          {cr.winning_hooks.map((h, i) => (
                            <li key={i} className="rounded-lg border border-brand-line bg-brand-bg p-2.5">
                              <div className="text-sm font-medium">“{h.hook}”</div>
                              {h.why_works && <div className="mt-0.5 text-xs text-brand-muted">{h.why_works}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!cr.format_mix?.length && (
                      <div>
                        <MiniTitle>Format mix</MiniTitle>
                        <ul className="space-y-1 text-sm">
                          {cr.format_mix.map((f, i) => (
                            <li key={i} className="flex justify-between gap-2">
                              <span>{f.format}</span>
                              <span className="text-brand-muted">{f.share}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!cr.content_pillars?.length && (
                      <div>
                        <MiniTitle>Content pillars</MiniTitle>
                        <Chips items={cr.content_pillars} />
                      </div>
                    )}
                    {cr.posting_cadence && (
                      <div>
                        <MiniTitle>Pola posting</MiniTitle>
                        <p className="text-sm">{cr.posting_cadence}</p>
                      </div>
                    )}
                    {!!cr.engagement_drivers?.length && (
                      <div className="sm:col-span-2">
                        <MiniTitle>Pendorong engagement</MiniTitle>
                        <Bullets items={cr.engagement_drivers} />
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* 4. Rencana aksi */}
              {!!j.action_plan?.length && (
                <Section title="4 · Rencana aksi untuk akunku" accent>
                  <ul className="space-y-2">
                    {j.action_plan.map((p, i) => (
                      <li key={i} className="rounded-lg border border-brand-line bg-brand-bg p-2.5">
                        <div className="text-sm font-medium">{p.play}</div>
                        {p.rationale && <div className="mt-0.5 text-xs text-brand-muted">{p.rationale}</div>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
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

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-brand-panel p-4 ${accent ? 'border-brand-accent/30' : 'border-brand-line'}`}>
      <div className="mb-3 text-sm font-bold text-brand-text">{title}</div>
      {children}
    </div>
  );
}
function MiniTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">{children}</div>;
}
function MiniList({ title, items, tone }: { title: string; items: string[]; tone?: 'success' | 'danger' | 'accent' }) {
  return (
    <div>
      <MiniTitle>{title}</MiniTitle>
      <Bullets items={items} tone={tone} />
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
