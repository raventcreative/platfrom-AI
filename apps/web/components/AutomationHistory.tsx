'use client';

// Panel riwayat generasi GAMBAR AI Automation (dari tabel ImageGeneration).
// Tampilkan brief + waktu + thumbnail; bisa dibuka (lihat besar + caption/prompt),
// unduh per-gambar, dan hapus entri.

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

type ImgItem = {
  imagePrompt?: string;
  caption?: string;
  hashtags?: string[];
  image?: string | null; // data URL
  size?: string;
  model?: string;
};
type ImgGen = {
  id: string;
  brandId?: string | null;
  brief: string;
  aspect: string;
  count: number;
  results: ImgItem[];
  createdAt: string;
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// Unduh satu data URL sebagai PNG.
function downloadImage(dataUrl: string, name: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// refreshKey: naik tiap ada generasi baru → memicu fetch ulang.
export function AutomationHistory({ brandId, refreshKey }: { brandId?: string; refreshKey: number }) {
  const [items, setItems] = useState<ImgGen[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .listAutomationImages(brandId)
      .then((r: ImgGen[]) => setItems(Array.isArray(r) ? r : []))
      .catch(() => setItems([]));
  }, [brandId]);

  useEffect(() => {
    setOpen(new Set());
    load();
  }, [load, refreshKey]);

  function toggle(id: string) {
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function remove(id: string) {
    if (!confirm('Hapus entri riwayat ini? Permanen.')) return;
    setBusy(true);
    try {
      await api.deleteAutomationImage(id);
      toast('Riwayat dihapus');
      setItems((s) => s.filter((x) => x.id !== id));
    } catch {
      toast('Gagal menghapus', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Riwayat gambar
        </div>
        <div className="flex-1" />
        <button onClick={load} className="rounded-lg border border-brand-line px-2.5 py-1 text-xs hover:bg-white/5">
          ↻ Segarkan
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">Belum ada riwayat generasi gambar.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const isOpen = open.has(it.id);
            const imgs = (it.results ?? []).filter((r) => r.image);
            return (
              <li key={it.id} className="rounded-lg border border-brand-line bg-brand-bg p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-text">{it.brief}</p>
                    <p className="text-xs text-brand-muted">
                      {fmtTime(it.createdAt)} · {it.count} gambar · {it.aspect}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(it.id)}
                    className="rounded-lg border border-brand-line px-2 py-1 text-xs hover:bg-white/5"
                  >
                    {isOpen ? 'Tutup' : 'Lihat'}
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    disabled={busy}
                    className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    Hapus
                  </button>
                </div>

                {/* Thumbnail strip (selalu tampil bila ada gambar) */}
                {imgs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(isOpen ? imgs : imgs.slice(0, 4)).map((r, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={r.image as string}
                        alt={`thumb ${i + 1}`}
                        onClick={() => downloadImage(r.image as string, `automation-${it.id}-${i + 1}.png`)}
                        title="Klik untuk unduh"
                        className={`cursor-pointer rounded-lg border border-brand-line object-cover ${
                          isOpen ? 'h-40 w-40' : 'h-16 w-16'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Detail: caption + prompt tiap gambar */}
                {isOpen && (
                  <div className="mt-2 space-y-2">
                    {(it.results ?? []).map((r, i) => (
                      <div key={i} className="rounded-lg border border-brand-line bg-brand-panel p-2.5 text-xs">
                        <div className="font-semibold text-brand-text">Gambar {i + 1}</div>
                        {r.caption && <p className="mt-1 text-brand-text">{r.caption}</p>}
                        {!!r.hashtags?.length && (
                          <p className="mt-0.5 text-brand-accent">
                            {r.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                          </p>
                        )}
                        {r.imagePrompt && <p className="mt-1 text-slate-400">{r.imagePrompt}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
