import { Injectable, Logger } from '@nestjs/common';

/**
 * Slot integrasi data live (IG/web). Dikonfigurasi lewat env:
 *   IG_SCRAPER_URL  — endpoint scraper (mis. Apify/RapidAPI), handle di-append.
 *   IG_SCRAPER_KEY  — bearer token bila diperlukan.
 * Bila belum diset → fetchInstagram() mengembalikan null dan tool jatuh ke
 * mode "analisis dari data yang ditempel + pengetahuan AI" (fallback).
 */
@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly url = process.env.IG_SCRAPER_URL;
  private readonly key = process.env.IG_SCRAPER_KEY;

  get configured(): boolean {
    return Boolean(this.url);
  }

  /** Ambil beberapa akun sekaligus; hasil hanya yang berhasil (non-null). */
  async fetchInstagramMany(
    handles: string[],
  ): Promise<{ handle: string; data: unknown }[]> {
    if (!this.configured) return [];
    const out = await Promise.all(
      handles.slice(0, 8).map(async (h) => {
        const data = await this.fetchInstagram(h);
        return data ? { handle: h.trim().replace(/^@/, ''), data } : null;
      }),
    );
    return out.filter(Boolean) as { handle: string; data: unknown }[];
  }

  /** Ambil data akun Instagram; null bila scraper belum dikonfigurasi/gagal. */
  async fetchInstagram(handle?: string): Promise<unknown | null> {
    const h = handle?.trim().replace(/^@/, '');
    if (!this.url || !h) return null;
    try {
      const res = await fetch(this.url + encodeURIComponent(h), {
        headers: this.key ? { authorization: `Bearer ${this.key}` } : {},
      });
      if (!res.ok) {
        this.logger.warn(`Scraper ${res.status} untuk @${h}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      this.logger.warn(`Scraper gagal: ${String(e)}`);
      return null;
    }
  }
}
