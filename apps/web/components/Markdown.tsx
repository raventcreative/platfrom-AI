'use client';

// Render teks Markdown jadi HTML rapi (heading, bold, list, tabel GFM).
// Dipakai untuk SEMUA output konten AI agar mudah dibaca. Styling di globals.css (.md).

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
    </div>
  );
}
