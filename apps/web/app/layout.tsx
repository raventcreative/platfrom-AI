// Root layout aplikasi Next.js (App Router).
// Membungkus semua halaman dengan sidebar navigasi + container toast global.
import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { Toaster } from '../components/Toaster';

// Metadata dokumen (judul & deskripsi) yang dipakai <head> di seluruh halaman.
export const metadata: Metadata = {
  title: 'ProdPilot',
  description: 'AI Content Automation Platform untuk Multi-Brand',
};

// Layout utama: menyusun sidebar + area konten yang bisa di-scroll, plus Toaster.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-brand-bg text-brand-text antialiased">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
