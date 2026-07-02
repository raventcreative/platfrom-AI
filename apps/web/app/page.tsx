'use client';

// Halaman utama (/): AI Content Creation.
// Tab "Generate" (studio konten harian) & "Inspirasi" (inspirasi konten dari tren).
import { useState } from 'react';
import { BrandSwitcher, type Brand } from '../components/BrandSwitcher';
import { GeneratorStudio } from '../components/GeneratorStudio';
import { InsightTool } from '../components/InsightTool';

type Tab = 'generate' | 'inspirasi';

export default function Home() {
  // Brand yang sedang dipilih; undefined saat belum ada pilihan.
  const [brand, setBrand] = useState<Brand>();
  const [tab, setTab] = useState<Tab>('generate');

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-line bg-brand-panel px-6 py-3">
        <h1 className="text-base font-semibold text-brand-text">AI Content Creation</h1>
        <div className="ml-2 flex gap-1">
          {(['generate', 'inspirasi'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t
                  ? 'bg-brand-accent/15 text-brand-accent'
                  : 'text-brand-muted hover:bg-white/5'
              }`}
            >
              {t === 'generate' ? 'Generate' : 'Inspirasi'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-brand-muted">Brand:</span>
        <BrandSwitcher value={brand?.id} onChange={setBrand} />
      </header>

      {tab === 'generate' ? (
        <GeneratorStudio brandId={brand?.id} />
      ) : (
        <div className="mx-auto max-w-5xl p-5">
          {!brand ? (
            <div className="text-sm text-brand-muted">Pilih brand untuk mulai.</div>
          ) : (
            <InsightTool
              type="inspiration"
              title="Inspirasi konten"
              description="Ide konten segar dari tren yang relevan dengan brand ini."
              brandId={brand.id}
              runLabel="Cari inspirasi"
              fields={[
                { id: 'theme', label: 'Tema/arah (opsional)', placeholder: 'mis. edukasi bahan aktif, storytelling produk' },
                { id: 'platform', label: 'Platform (opsional)', placeholder: 'IG Reels / TikTok / IG Feed' },
              ]}
            />
          )}
        </div>
      )}
    </>
  );
}
