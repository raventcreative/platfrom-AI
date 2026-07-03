'use client';

import { useState } from 'react';
import { BrandSwitcher, type Brand } from '../components/BrandSwitcher';
import { ChatShell } from '../components/ChatShell';

const FEATURES = [
  ['🎬', 'Script Reels & TikTok', '3 hook + adegan + CTA, tinggal shoot'],
  ['🎠', 'Carousel + preview', 'slide per slide, langsung kelihatan jadinya'],
  ['✍️', 'Caption & hashtag', 'panjang, pendek, 5 hook cadangan'],
  ['🗓️', 'Ide seminggu', '7 hari terisi, rasio 80/20 sehat'],
  ['🔍', 'Review & kompetitor', 'analisis asli dari caption-mu'],
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
        <span className="ce-tagline hidden sm:inline">konten jadi, mikirnya nggak pake lama ✦</span>
        <span className="flex-1" />
        <span className="ce-badge-pine">⚡ instan</span>
      </header>

      <div className="ce-hero">
        <span className="ce-kicker">⚡ Gratis · tanpa daftar · langsung jadi</span>
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
            💬 Buka workspace chat
          </button>
        </div>
        <p className="ce-note">
          Tombol utama membuka aplikasi lengkap (jalan tanpa server). Workspace chat butuh API aktif.
        </p>

        <div className="ce-feat-grid">
          {FEATURES.map(([e, title, sub]) => (
            <div className="ce-feat" key={title}>
              <span className="e">{e}</span>
              <b>{title}</b>
              <span>{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
