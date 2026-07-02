'use client';

// Sidebar navigasi kiri: menampilkan menu utama aplikasi (Content Engine & Brand)
// dan menandai item aktif berdasarkan path URL saat ini.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navigasi dikelompokkan: 4 mode AI + kelola Brand.
type NavItem = { href: string; label: string; icon: string; match: (p: string) => boolean };
const AI_MODES: NavItem[] = [
  { href: '/', label: 'AI Content Creation', icon: '✍️', match: (p) => p === '/' },
  { href: '/strategy', label: 'AI Marketing Strategy', icon: '📊', match: (p) => p.startsWith('/strategy') },
  { href: '/automation', label: 'AI Automation', icon: '⚙️', match: (p) => p.startsWith('/automation') },
  { href: '/education', label: 'AI Education Insight', icon: '🎓', match: (p) => p.startsWith('/education') },
];
const OTHER: NavItem[] = [
  { href: '/brands', label: 'Brand', icon: '🏷️', match: (p) => p.startsWith('/brands') },
];

/** Komponen sidebar; merender daftar NAV sebagai link dengan gaya aktif/non-aktif. */
export function Sidebar() {
  const pathname = usePathname() ?? '/';

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-brand-line bg-brand-panel">
      <div className="flex items-center gap-2.5 border-b border-brand-line px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-xs font-black text-brand-bg">
          AI
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-brand-text">AIpreneur</div>
          <div className="text-[11px] text-brand-muted">Content Engine</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Mode AI
        </div>
        {AI_MODES.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Data
        </div>
        {OTHER.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

/** Satu link navigasi dengan gaya aktif/non-aktif. */
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${
        active
          ? 'bg-white/[0.06] text-brand-text'
          : 'text-brand-muted hover:bg-white/[0.03] hover:text-brand-text'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-accent" />
      )}
      <span className="text-[15px] leading-none opacity-90">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
