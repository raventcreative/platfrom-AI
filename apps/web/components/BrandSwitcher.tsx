'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type Brand = { id: string; name: string; niche?: string };

export function BrandSwitcher({
  value,
  onChange,
}: {
  value?: string;
  onChange: (b: Brand) => void;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    api
      .listBrands()
      .then((bs: Brand[]) => {
        setBrands(bs);
        if (bs[0] && !value) onChange(bs[0]);
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <div className="text-sm text-red-600">Gagal memuat brand: {error}</div>;
  }

  return (
    <select
      className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
      value={value ?? ''}
      onChange={(e) => {
        const b = brands.find((x) => x.id === e.target.value);
        if (b) onChange(b);
      }}
    >
      {brands.length === 0 && <option>Belum ada brand</option>}
      {brands.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
