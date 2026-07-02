'use client';

// GeneratorStudio: studio konten harian. Pengguna mengisi "daily input",
// memilih generator (script/carousel/dll), lalu memicu job generate ke API
// dan menampilkan hasilnya. Setting LLM diambil dari localStorage.

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { ModelSettings } from './ModelSettings';
import { HistoryPanel } from './HistoryPanel';
import { Markdown } from './Markdown';
import { downloadHtmlPdf } from '../lib/pdf';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  PROVIDER_LABEL,
  type LlmSettings,
} from '../lib/llmSettings';
import type { Sku } from '../lib/brandSchema';

// Jenis agent generator yang didukung.
type Agent = 'SCRIPT' | 'CAROUSEL' | 'STORYBOARD' | 'CAPTION' | 'IDEAS';

type Field = {
  id: string;
  label: string;
  type?: 'text' | 'textarea' | 'select';
  hint?: string;
  options?: string[];
};

// Daily input — fokus hari ini (mirror prototype content-engine.html).
const DAILY_FIELDS: Field[] = [
  { id: 'focus', label: 'Fokus hari ini', type: 'textarea', hint: 'produk / promo / edukasi / momen / brand story' },
  { id: 'detail', label: 'Detail fokus', type: 'textarea', hint: 'mis. "promo bundling 2 serum 99k sampai Minggu"' },
  { id: 'dgoal', label: 'Tujuan hari ini', type: 'select', options: ['', 'Awareness', 'Engagement', 'Jualan', 'Edukasi'] },
  { id: 'moment', label: 'Momen/event relevan', type: 'textarea', hint: 'gajian, Ramadan, weekend, tanggal cantik' },
  {
    id: 'hook',
    label: 'Tipe hook',
    type: 'select',
    options: [
      '',
      'Problem hook',
      'Myth vs Facts hook',
      'POV hook',
      'Controversial hook',
      'Negative hook',
      'Relatable hook',
      'Before-After hook',
      'Mistake hook',
      'Question hook',
      'Secret / Underrated hook',
      'Comparison hook',
      'Checklist hook',
      'Story hook',
      'Trend hook',
      'Pain-to-Solution hook',
      'Soft Challenge hook',
    ],
  },
  { id: 'angle', label: 'Angle/hook yang mau dicoba', type: 'textarea', hint: 'POV, mitos vs fakta, "jangan beli kalau..."' },
  { id: 'platform', label: 'Platform tujuan', type: 'select', options: ['IG Reels', 'TikTok', 'IG Feed'] },
  { id: 'notes', label: 'Catatan khusus', type: 'textarea' },
];

// Daftar generator yang bisa dipicu pengguna, beserta label tampilannya.
const GENERATORS: { agent: Agent; label: string }[] = [
  { agent: 'SCRIPT', label: 'Script Reels/TikTok' },
  { agent: 'CAROUSEL', label: 'Carousel IG' },
  { agent: 'STORYBOARD', label: 'Storyboard' },
  { agent: 'CAPTION', label: 'Caption + Hashtag' },
  { agent: 'IDEAS', label: 'Ide mingguan' },
];
const LABEL: Record<Agent, string> = Object.fromEntries(
  GENERATORS.map((g) => [g.agent, g.label]),
) as Record<Agent, string>;

// Satu hasil generate yang ditampilkan di daftar (per pemicuan generator).
type Result = {
  id: string;
  agent: Agent;
  status: 'running' | 'done' | 'error';
  readable?: string;
  json?: unknown;
  demo?: boolean;
  error?: string;
};

// Rangkai field daily jadi satu blok teks "Label: nilai" (hanya yang terisi).
function composeDaily(values: Record<string, string>): string {
  return DAILY_FIELDS.map((f) => {
    const v = (values[f.id] ?? '').trim();
    return v ? `${f.label}: ${v}` : '';
  })
    .filter(Boolean)
    .join('\n');
}

// Baris "Produk fokus" untuk SKU terpilih (mis. "Serum Glow [Skincare] — 89k").
function formatSkuLine(sku: Sku): string {
  let line = sku.name.trim();
  if (sku.category?.trim()) line += ` [${sku.category.trim()}]`;
  if (sku.price?.trim()) line += ` — ${sku.price.trim()}`;
  if (sku.notes?.trim()) line += `: ${sku.notes.trim()}`;
  return `Produk fokus: ${line}`;
}

/** Studio generator konten untuk brand terpilih (`brandId`). */
export function GeneratorStudio({ brandId }: { brandId?: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [historyKey, setHistoryKey] = useState(0); // pemicu refresh riwayat
  const [skus, setSkus] = useState<Sku[]>([]); // daftar SKU brand aktif
  const [skuName, setSkuName] = useState(''); // SKU terpilih ('' = semua produk)

  // localStorage baru tersedia di client; sinkronkan setelah mount.
  useEffect(() => setSettings(loadSettings()), []);

  // Ambil daftar SKU brand terpilih untuk dropdown "Produk fokus".
  useEffect(() => {
    setSkuName('');
    if (!brandId) {
      setSkus([]);
      return;
    }
    api
      .getBrand(brandId)
      .then((b: { profile?: { skus?: Sku[] } }) =>
        setSkus(Array.isArray(b.profile?.skus) ? b.profile!.skus! : []),
      )
      .catch(() => setSkus([]));
  }, [brandId]);

  const provider = settings.provider;
  // Ada API key => mode "live"; kosong => fallback "mode demo".
  const hasKey = Boolean(settings.keys[provider]?.trim());

  // Perbarui satu field daily input.
  function setField(id: string, v: string) {
    setValues((s) => ({ ...s, [id]: v }));
  }
  // Patch parsial pada satu Result berdasarkan id-nya.
  function patch(id: string, p: Partial<Result>) {
    setResults((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  // Polling status job: cek tiap 1.5s hingga 40x (~60s) sampai SUCCEEDED/FAILED,
  // lalu update Result terkait. Timeout bila belum selesai dalam batas itu.
  async function pollJob(resultId: string, jobId: string, agent: Agent) {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const job = await api.getJob(jobId);
        if (job.status === 'SUCCEEDED') {
          patch(resultId, {
            status: 'done',
            readable: job.output?.readable ?? '(kosong)',
            json: job.output?.json ?? null,
            demo: job.output?.demo,
          });
          toast(`${LABEL[agent]} berhasil digenerate`);
          setHistoryKey((k) => k + 1); // segarkan riwayat setelah hasil tersimpan
          return;
        }
        if (job.status === 'FAILED') {
          patch(resultId, { status: 'error', error: job.error ?? 'unknown' });
          toast(`${LABEL[agent]} gagal digenerate`, 'error');
          setHistoryKey((k) => k + 1);
          return;
        }
      } catch {
        // keep polling
      }
    }
    patch(resultId, { status: 'error', error: 'Timeout menunggu hasil.' });
  }

  // Jalankan satu atau beberapa generator secara berurutan untuk brand aktif.
  async function runGenerate(agents: Agent[]) {
    if (!brandId || busy) return;
    setBusy(true);
    // Sisipkan baris "Produk fokus" di atas daily input bila SKU dipilih.
    const sku = skus.find((s) => s.name === skuName);
    const input = [sku ? formatSkuLine(sku) : '', composeDaily(values)]
      .filter(Boolean)
      .join('\n');
    try {
      for (const agent of agents) {
        // Id unik hasil = agent + indeks + timestamp agar aman untuk key React.
        const id = `${agent}-${results.length}-${Math.round(performance.now())}`;
        setResults((rs) => [{ id, agent, status: 'running' }, ...rs]);
        try {
          const res = await api.generate({
            brandId,
            agent,
            input,
            provider,
            // API key dikirim per-request (tidak disimpan di server); undefined => mode demo.
            apiKey: settings.keys[provider]?.trim() || undefined,
            model: settings.models[provider],
          });
          if (res.jobId) await pollJob(id, res.jobId, agent);
          else patch(id, { status: 'error', error: 'Tidak ada jobId.' });
        } catch (e) {
          patch(id, { status: 'error', error: String(e) });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  // Salin teks ke clipboard (dipakai tombol "Copy teks"/"Copy JSON").
  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  // Ekspor hasil (markdown ter-render) ke PDF.
  async function downloadPdf(r: Result) {
    const el = document.getElementById(`md-${r.id}`);
    if (!el) return;
    const title = LABEL[r.agent];
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await downloadHtmlPdf(el.innerHTML, `${title.replace(/[^\w]+/g, '-')}-${stamp}`, title);
      toast('PDF diunduh');
    } catch (e) {
      toast(`Gagal membuat PDF: ${e}`, 'error');
    }
  }

  if (!brandId) {
    return <div className="p-6 text-sm text-brand-muted">Pilih brand untuk mulai.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-5">
      {/* Model + status key */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            hasKey
              ? 'border-green-400/30 bg-green-400/10 text-green-300'
              : 'border-orange-400/30 bg-orange-400/10 text-orange-300'
          }`}
        >
          {hasKey ? `live · ${settings.models[provider]}` : 'mode demo'}
        </span>
        <span className="text-sm text-brand-muted">{PROVIDER_LABEL[provider]}</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-lg border border-brand-line px-3 py-1.5 text-sm text-brand-text hover:bg-white/5"
        >
          ⚙️ Pengaturan model
        </button>
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

      {/* Daily input form */}
      <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-muted">
          Daily input — fokus hari ini
        </div>

        {/* Pilih SKU/produk yang jadi fokus konten (opsional). */}
        {skus.length > 0 && (
          <div className="mb-3">
            <label className="mb-1 block text-[13px] font-semibold text-brand-text">
              Produk / SKU fokus
            </label>
            <select
              className="w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent sm:w-1/2"
              value={skuName}
              onChange={(e) => setSkuName(e.target.value)}
              disabled={busy}
            >
              <option value="">Semua produk (umum)</option>
              {skus.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.category ? ` — ${s.category}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {DAILY_FIELDS.map((f) => (
            <div key={f.id} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <label className="mb-1 block text-[13px] font-semibold text-brand-text">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  className="min-h-[64px] w-full resize-y rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent"
                  value={values[f.id] ?? ''}
                  onChange={(e) => setField(f.id, e.target.value)}
                />
              ) : f.type === 'select' ? (
                <select
                  className="w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent"
                  value={values[f.id] ?? ''}
                  onChange={(e) => setField(f.id, e.target.value)}
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>{o || '(pilih)'}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent"
                  value={values[f.id] ?? ''}
                  onChange={(e) => setField(f.id, e.target.value)}
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-brand-muted">{f.hint}</p>}
            </div>
          ))}
        </div>

        <div className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-brand-muted">Generate</div>
        <div className="flex flex-wrap gap-2">
          {GENERATORS.map((g) => (
            <button
              key={g.agent}
              onClick={() => runGenerate([g.agent])}
              disabled={busy}
              className="rounded-lg border border-brand-line bg-brand-panel px-3 py-2 text-sm font-medium text-brand-text hover:bg-white/5 disabled:opacity-50"
            >
              {g.label}
            </button>
          ))}
          <button
            onClick={() =>
              runGenerate(['SCRIPT', 'CAROUSEL', 'STORYBOARD', 'CAPTION', 'IDEAS'])
            }
            disabled={busy}
            className="rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
          >
            ⚡ Paket Lengkap
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.id} className="rounded-xl border border-brand-line bg-brand-panel p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{LABEL[r.agent]}</h4>
              {r.status === 'running' && <span className="text-xs text-brand-muted">menyusun…</span>}
              {r.status === 'done' && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    r.demo
                      ? 'border-orange-400/30 bg-orange-400/10 text-orange-300'
                      : 'border-green-400/30 bg-green-400/10 text-green-300'
                  }`}
                >
                  {r.demo ? 'mode demo' : 'live'}
                </span>
              )}
            </div>

            {r.status === 'error' && (
              <p className="mt-2 text-sm text-red-300">Gagal: {r.error}</p>
            )}
            {r.status === 'done' && (
              <>
                <div id={`md-${r.id}`} className="mt-2 rounded-lg border border-brand-line bg-black/30 p-3">
                  <Markdown>{r.readable ?? ''}</Markdown>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadPdf(r)}
                    className="rounded-lg bg-brand-accent px-2.5 py-1 text-xs font-medium text-brand-bg hover:bg-brand-accentHover"
                  >
                    ⬇ Download PDF
                  </button>
                  <button
                    onClick={() => copy(r.readable ?? '')}
                    className="rounded-lg border border-brand-line px-2.5 py-1 text-xs text-brand-text hover:bg-white/5"
                  >
                    Copy teks
                  </button>
                </div>
                {/* JSON carousel = KOLOM TERPISAH. Sengaja di luar #md-{id} agar
                    TIDAK ikut ke PDF (downloadPdf hanya membaca elemen #md-{id}). */}
                {r.json != null && r.agent === 'CAROUSEL' && (
                  <div className="mt-3 rounded-lg border border-brand-line bg-black/20 p-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                        JSON carousel
                      </span>
                      <span className="text-[10px] text-brand-muted">untuk generate produk · tidak termasuk di PDF</span>
                      <div className="flex-1" />
                      <button
                        onClick={() => copy(JSON.stringify(r.json, null, 2))}
                        className="rounded-lg border border-brand-line px-2.5 py-1 text-xs text-brand-text hover:bg-white/5"
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre className="max-h-[40vh] overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-100">
                      {JSON.stringify(r.json, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Riwayat generate tersimpan + fitur bandingkan */}
      <HistoryPanel brandId={brandId} refreshKey={historyKey} />
    </div>
  );
}
