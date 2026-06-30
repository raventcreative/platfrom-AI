import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProdPilot',
  description: 'AI Content Automation Platform untuk Multi-Brand',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
