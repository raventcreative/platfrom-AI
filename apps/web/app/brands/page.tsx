'use client';

// Halaman daftar brand klien (/brands).
// Mengambil daftar brand dari API lalu menampilkannya sebagai kartu ringkas.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

// Bentuk data brand yang ditampilkan pada kartu daftar.
type Brand = {
  id: string;
  name: string;
  category?: string;
  profile?: Record<string, string>;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState<string>();

  // Muat daftar brand sekali saat halaman pertama dirender.
  useEffect(() => {
    api.listBrands().then(setBrands).catch((e) => setError(String(e)));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-line bg-brand-panel px-6 py-3">
        <h1 className="text-base font-semibold text-brand-text">Brand klien</h1>
        <div className="flex-1" />
        <Link
          href="/brands/new"
          className="rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accentHover"
        >
          + Tambah brand
        </Link>
      </header>

      <div className="mx-auto max-w-4xl p-5">
        {error && <p className="text-sm text-red-300">Gagal memuat: {error}</p>}
        {!error && brands.length === 0 && (
          <p className="text-sm text-brand-muted">
            Belum ada brand. Klik <b>+ Tambah brand</b> untuk mulai.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.id}`}
              className="rounded-xl border border-brand-line bg-brand-panel p-4 transition hover:border-brand-accent hover:shadow-sm"
            >
              <h3 className="font-semibold text-brand-text">{b.name || '(tanpa nama)'}</h3>
              <span className="mt-1 inline-block rounded-full bg-brand-accent/15 px-2 py-0.5 text-[11px] text-brand-accent">
                {(b.category ?? 'other').toLowerCase()}
              </span>
              <p className="mt-2 line-clamp-2 text-[13px] text-brand-muted">
                {b.profile?.usp || b.profile?.products || b.profile?.area || '—'}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
