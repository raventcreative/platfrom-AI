'use client';

import { useState } from 'react';
import { BrandSwitcher, type Brand } from '../components/BrandSwitcher';
import { ChatShell } from '../components/ChatShell';

/* ── ikon garis (SVG stroke, gaya Lucide) — pengganti emoji, selaras dengan app.html ── */
const PATHS: Record<string, string> = {
  film: 'M3 4h18v16H3zM8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5',
  carousel: 'M8 5h8v14H8zM5.5 7.5v9M2.5 9.5v5M18.5 7.5v9M21.5 9.5v5',
  pen: 'M12 19l7-7a2.1 2.1 0 0 0-3-3l-7 7-1 4 4-1ZM15 6l3 3',
  calendar: 'M3 4.5h18v16H3zM3 9h18M8 3v3M16 3v3',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  message: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1Z',
};

function Icon({ name }: { name: string }) {
  return (
    <span className="ico" aria-hidden>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={PATHS[name]} />
      </svg>
    </span>
  );
}

const FEATURES: [string, string, string][] = [
  ['film', 'Script Reels & TikTok', '3 hook + adegan + CTA, tinggal shoot'],
  ['carousel', 'Carousel + preview', 'slide per slide, langsung kelihatan jadinya'],
  ['pen', 'Caption & hashtag', 'panjang, pendek, 5 hook cadangan'],
  ['calendar', 'Ide seminggu', '7 hari terisi, rasio 80/20 sehat'],
  ['search', 'Review & kompetitor', 'analisis asli dari caption-mu'],
];

export default function Home() {
  // Home = landing dulu. Chat cuma muncul kalau user sengaja buka workspace
  // (butuh API NestJS jalan) — nggak lagi langsung nyemplung ke chat.
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [brand, setBrand] = useState<Brand>();

  if (view === 'workspace') {
    return (
      <main className="mx-auto flex h-screen max-w-5xl flex-col">
        <header className="ce-ws-header">
          <div className="flex items-center gap-3">
            <button className="ce-back" onClick={() => setView('landing')}>
              ← Beranda
            </button>
            <div>
              <h1 className="text-lg font-semibold">Workspace chat</h1>
              <p className="ce-ws-sub">butuh API (NestJS) jalan · lihat DEVELOPMENT.md</p>
            </div>
          </div>
          <BrandSwitcher value={brand?.id} onChange={setBrand} />
        </header>
        <section className="flex-1 overflow-hidden">
          <ChatShell brandId={brand?.id} />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="ce-topbar">
        <span className="ce-logo">
          Content<span className="ce-logo-dot">•</span>Engine
        </span>
        <span className="ce-tagline hidden sm:inline">konten jadi, mikirnya nggak pake lama</span>
        <span className="flex-1" />
        <span className="ce-badge-pine">
          <Icon name="bolt" /> instan
        </span>
      </header>

      <div className="ce-hero">
        <span className="ce-kicker">
          <Icon name="bolt" /> Gratis · tanpa daftar · langsung jadi
        </span>
        <h1 className="font-serif-display">
          Konten sosmed yang <span className="font-serif-em">kamu banget</span> — dalam hitungan detik.
        </h1>
        <p className="ce-lead">
          Ceritakan brand-mu sekali (3 menit). Habis itu tiap hari tinggal klik: script video,
          carousel, caption + hashtag, storyboard, sampai riset kompetitor.
        </p>

        <div className="ce-cta-row">
          <a className="ce-btn ce-btn-primary" href="/app.html">
            Mulai — ceritain brand-ku →
          </a>
          <button className="ce-btn ce-btn-outline" onClick={() => setView('workspace')}>
            <Icon name="message" /> Buka workspace chat
          </button>
        </div>
        <p className="ce-note">
          Tombol utama membuka aplikasi lengkap (jalan tanpa server). Workspace chat butuh API aktif.
        </p>

        <div className="ce-feat-grid">
          {FEATURES.map(([iconName, title, sub]) => (
            <div className="ce-feat" key={title}>
              <span className="e">
                <Icon name={iconName} />
              </span>
              <b>{title}</b>
              <span>{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
