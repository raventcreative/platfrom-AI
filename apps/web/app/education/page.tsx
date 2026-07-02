'use client';

// AI Education Insight: rangkuman pembelajaran/tren/best-practice untuk tim brand.
import { useState } from 'react';
import { BrandSwitcher, type Brand } from '../../components/BrandSwitcher';
import { InsightTool } from '../../components/InsightTool';

export default function EducationPage() {
  const [brand, setBrand] = useState<Brand>();

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-line bg-brand-panel px-6 py-3">
        <h1 className="text-base font-semibold text-brand-text">AI Education Insight</h1>
        <div className="flex-1" />
        <span className="text-xs text-brand-muted">Brand:</span>
        <BrandSwitcher value={brand?.id} onChange={setBrand} />
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-5">
        <InsightTool
          type="education"
          title="Education insight"
          description="Insight, tren, dan best-practice marketing/konten agar tim makin jago — plus action item minggu ini."
          brandId={brand?.id}
          runLabel="Buat insight"
          fields={[
            { id: 'topic', label: 'Topik (opsional)', placeholder: 'mis. hook Reels, funnel konten, tren skincare 2026' },
          ]}
        />
      </div>
    </>
  );
}
