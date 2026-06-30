'use client';

import { useState } from 'react';
import { BrandSwitcher, type Brand } from '../components/BrandSwitcher';
import { ChatShell } from '../components/ChatShell';

export default function Home() {
  const [brand, setBrand] = useState<Brand>();

  return (
    <main className="mx-auto flex h-screen max-w-5xl flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">ProdPilot</h1>
          <p className="text-xs text-neutral-500">
            AI Content Automation · Sprint 1 scaffold
          </p>
        </div>
        <BrandSwitcher value={brand?.id} onChange={setBrand} />
      </header>

      <section className="flex-1 overflow-hidden">
        <ChatShell brandId={brand?.id} />
      </section>
    </main>
  );
}
