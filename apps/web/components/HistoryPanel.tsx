'use client';

// Panel riwayat generate untuk satu brand (dari tabel Job).
// - Checkbox = pilih entri untuk DIHAPUS (tombol "Hapus terpilih").
// - Tombol "Bandingkan" per-entri = pilih A lalu B → tampilan berdampingan.

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { Markdown } from './Markdown';

type Agent = 'SCRIPT' | 'CAROUSEL' | 'STORYBOARD' | 'CAPTION' | 'IDEAS';

// Bentuk satu entri riwayat sesuai select() endpoint GET /jobs.
type HistoryJob = {
  id: string;
  agent: Agent;
  status: 'SUCCEEDED' | 'FAILED';
  input?: { content?: string; provider?: string };
  output?: { readable?: string; model?: string; demo?: boolean };
  error?: string;
  tokensUsed?: number;
  createdAt: string;
};

const LABEL: Record<Agent, string> = {
  SCRIPT: 'Script Reels/TikTok',
  CAROUSEL: 'Carousel IG',
  STORYBOARD: 'Storyboard',
  CAPTION: 'Caption + Hashtag',
  IDEAS: 'Ide mingguan',
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

// refreshKey: naik setiap ada generate baru → memicu fetch ulang riwayat.
export function HistoryPanel({
  brandId,
  refreshKey,
}: {
  brandId?: string;
  refreshKey: number;
}) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set()); // dipilih utk dihapus
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [compareA, setCompareA] = useState<string | null>(null); // entri A utk banding
  const [compareB, setCompareB] = useState<string | null>(null); // entri B utk banding
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!brandId) return;
    api
      .listJobs(brandId)
      .then((js: HistoryJob[]) => setJobs(js))
      .catch(() => setJobs([]));
  }, [brandId]);

  // Muat ulang saat brand berganti atau ada generate baru; reset pilihan.
  useEffect(() => {
    setToDelete(new Set());
    setExpanded(new Set());
    setCompareA(null);
    setCompareB(null);
    load();
  }, [load, refreshKey]);

  // Toggle centang hapus untuk sebuah entri.
  function toggleDelete(id: string) {
    setToDelete((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpanded((e) => {
      const next = new Set(e);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Tombol "Bandingkan" per-entri: klik pertama = A, klik kedua = B (buka modal).
  function pickCompare(id: string) {
    if (compareA === id) {
      setCompareA(null);
      return;
    }
    if (!compareA) {
      setCompareA(id);
      return;
    }
    setCompareB(id); // A sudah ada → jadikan B, modal terbuka
  }

  // Hapus semua entri yang dicentang.
  async function deleteSelected() {
    if (toDelete.size === 0) return;
    if (!confirm(`Hapus ${toDelete.size} entri riwayat? Tindakan ini permanen.`)) return;
    setBusy(true);
    try {
      await Promise.all([...toDelete].map((id) => api.deleteJob(id)));
      toast(`${toDelete.size} entri riwayat dihapus`);
      setToDelete(new Set());
      load();
    } catch (e) {
      toast('Gagal menghapus riwayat', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!brandId) return null;

  const a = jobs.find((j) => j.id === compareA) ?? null;
  const b = jobs.find((j) => j.id === compareB) ?? null;

  return (
    <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Riwayat generate
        </div>
        {compareA && !compareB && (
          <span className="text-xs text-brand-accent">Pilih 1 entri lagi untuk dibandingkan…</span>
        )}
        <div className="flex-1" />
        <button
          onClick={deleteSelected}
          disabled={busy || toDelete.size === 0}
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
        >
          Hapus terpilih ({toDelete.size})
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-brand-muted">Belum ada riwayat untuk brand ini.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {jobs.map((j) => {
            const open = expanded.has(j.id);
            const isA = compareA === j.id;
            return (
              <li key={j.id} className={`py-2 ${isA ? 'rounded-lg bg-brand-accent/10' : ''}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={toDelete.has(j.id)}
                    onChange={() => toggleDelete(j.id)}
                    aria-label="Pilih untuk hapus"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{LABEL[j.agent]}</span>
                      <StatusBadge job={j} />
                      <span className="text-xs text-brand-muted">{fmtTime(j.createdAt)}</span>
                    </div>
                    {j.input?.content && (
                      <p className="truncate text-xs text-brand-muted">
                        Prompt: {j.input.content.replace(/\n/g, ' · ')}
                      </p>
                    )}
                    <div className="mt-1 flex gap-3">
                      <button
                        onClick={() => toggleExpand(j.id)}
                        className="text-xs text-brand-accent hover:underline"
                      >
                        {open ? 'Sembunyikan' : 'Lihat hasil'}
                      </button>
                      <button
                        onClick={() => pickCompare(j.id)}
                        className="text-xs text-brand-muted hover:underline"
                      >
                        {isA ? 'Batal banding' : 'Bandingkan'}
                      </button>
                    </div>
                    {open && (
                      <div className="mt-1 max-h-72 overflow-auto rounded-lg border border-brand-line bg-black/30 p-2.5">
                        {j.status === 'FAILED' ? (
                          <p className="text-xs text-brand-danger">Gagal: {j.error ?? 'unknown'}</p>
                        ) : (
                          <Markdown>{j.output?.readable ?? '(kosong)'}</Markdown>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {a && b && (
        <CompareModal
          a={a}
          b={b}
          onClose={() => {
            setCompareA(null);
            setCompareB(null);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ job }: { job: HistoryJob }) {
  if (job.status === 'FAILED') {
    return (
      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[11px] text-red-300">
        gagal
      </span>
    );
  }
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] ${
        job.output?.demo
          ? 'border-orange-400/30 bg-orange-400/10 text-orange-300'
          : 'border-green-400/30 bg-green-400/10 text-green-300'
      }`}
    >
      {job.output?.demo ? 'demo' : job.output?.model ?? 'live'}
    </span>
  );
}

// Modal bandingkan 2 generate berdampingan (prompt + output).
function CompareModal({
  a,
  b,
  onClose,
}: {
  a: HistoryJob;
  b: HistoryJob;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-brand-line bg-brand-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-brand-line px-4 py-3">
          <h3 className="text-base font-bold">Bandingkan hasil</h3>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-lg border border-brand-line px-3 py-1.5 text-sm text-brand-text hover:bg-white/5"
          >
            Tutup
          </button>
        </div>
        <div className="grid flex-1 gap-4 overflow-auto p-4 sm:grid-cols-2">
          {[a, b].map((j, i) => (
            <div key={j.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold">
                  {i === 0 ? 'A' : 'B'}
                </span>
                <span className="text-sm font-semibold">{LABEL[j.agent]}</span>
                <StatusBadge job={j} />
              </div>
              <div className="text-xs text-brand-muted">{fmtTime(j.createdAt)}</div>
              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Prompt
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-brand-line bg-black/30 p-2 text-xs text-brand-text">
                  {j.input?.content?.trim() || '(tanpa daily input — pakai profil brand)'}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Hasil
                </div>
                <div className="max-h-[40vh] overflow-auto rounded-lg border border-brand-line bg-brand-panel p-2.5">
                  {j.status === 'FAILED' ? (
                    <p className="text-xs text-brand-danger">Gagal: {j.error ?? 'unknown'}</p>
                  ) : (
                    <Markdown>{j.output?.readable ?? '(kosong)'}</Markdown>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
