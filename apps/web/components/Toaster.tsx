'use client';

// Toaster: kontainer notifikasi global yang muncul di bawah-tengah layar.
// Berlangganan ke store toast dan menampilkan daftar toast aktif.

import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastItem } from '../lib/toast';

/** Merender daftar toast (sukses/error) dan menyinkronkannya dengan store toast. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  // Berlangganan ke store toast; fungsi unsubscribe dikembalikan sebagai cleanup effect.
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            t.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-brand-panel2 border border-brand-line text-brand-text'
          }`}
        >
          {t.type === 'error' ? '⚠️ ' : '✓ '}
          {t.message}
        </div>
      ))}
    </div>
  );
}
