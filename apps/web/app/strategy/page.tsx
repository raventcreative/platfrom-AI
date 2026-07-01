'use client';

// AI Marketing Strategy: satu form riset IG — akun saya + kompetitor.
import { useState } from 'react';
import { BrandSwitcher, type Brand } from '../../components/BrandSwitcher';
import { IgResearch } from '../../components/IgResearch';

export default function StrategyPage() {
  const [brand, setBrand] = useState<Brand>();

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-line bg-brand-panel px-6 py-3">
        <h1 className="text-base font-semibold text-brand-text">AI Marketing Strategy</h1>
        <div className="flex-1" />
        <span className="text-xs text-brand-muted">Brand:</span>
        <BrandSwitcher value={brand?.id} onChange={setBrand} />
      </header>

      <div className="mx-auto max-w-5xl p-5">
        <IgResearch brandId={brand?.id} />
      </div>
    </>
  );
}
