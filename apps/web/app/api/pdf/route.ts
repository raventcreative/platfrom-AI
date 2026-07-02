// Route pembuat PDF pakai PUPPETEER (mesin cetak Chromium asli).
// Client (downloadHtmlPdf) POST { html, title } → di sini HTML dibungkus dokumen
// bertema terang + CSS cetak A4, lalu Chromium mencetaknya jadi PDF. Karena
// memakai mesin cetak browser, pagination-nya NATIVE: tidak ada baris/kalimat
// yang terpotong, header tabel bisa berulang, header/footer & nomor halaman rapi.
import { NextResponse } from 'next/server';
import type { Browser } from 'puppeteer';

// Puppeteer butuh Node runtime (bukan Edge) & jangan di-cache.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reuse satu instance browser antar-request (hemat ~1 dtk/panggilan).
let browserPromise: Promise<Browser> | null = null;
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const puppeteer = (await import('puppeteer')).default;
    browserPromise = puppeteer.launch({
      headless: true,
      // Pakai Chrome sistem bila env di-set; jika tidak, Chromium bawaan Puppeteer.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

// Escape teks agar aman disisipkan ke template HTML header/footer.
function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

// CSS cetak: tema TERANG + aturan pemenggalan halaman yang benar.
const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  .md {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px; line-height: 1.6; color: #111; word-wrap: break-word;
  }
  .md h1, .md h2, .md h3, .md h4 { color: #000; font-weight: 700; line-height: 1.3; margin: 0.9em 0 0.4em; break-after: avoid; page-break-after: avoid; }
  .md h1 { font-size: 1.5em; } .md h2 { font-size: 1.28em; } .md h3 { font-size: 1.12em; } .md h4 { font-size: 1em; }
  .md p { margin: 0.5em 0; orphans: 2; widows: 2; }
  .md strong, .md b { color: #000; font-weight: 700; }
  .md em, .md i { color: #1a1a1a; }
  .md a { color: #0b62c4; text-decoration: underline; }
  .md ul, .md ol { margin: 0.5em 0; padding-left: 1.5em; }
  .md ul { list-style: disc; } .md ol { list-style: decimal; }
  .md li { margin: 0.28em 0; break-inside: avoid; page-break-inside: avoid; }
  .md li::marker { color: #0b62c4; }
  .md blockquote { margin: 0.7em 0; padding: 0.2em 0.9em; border-left: 3px solid #0b62c4; color: #333; background: #f3f6fb; border-radius: 0 6px 6px 0; break-inside: avoid; }
  .md hr { margin: 1em 0; border: 0; border-top: 1px solid #ddd; }
  .md code { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 0.88em; background: #eef1f5; color: #1a1a1a; padding: 0.12em 0.38em; border-radius: 5px; }
  .md pre { margin: 0.7em 0; padding: 0.85em 1em; background: #f5f6f8; border: 1px solid #dfe3e8; border-radius: 8px; overflow: auto; break-inside: avoid; }
  .md pre code { background: transparent; padding: 0; }
  .md table { width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 0.95em; }
  .md thead { display: table-header-group; }           /* ulang header tabel tiap halaman */
  .md tr { break-inside: avoid; page-break-inside: avoid; }
  .md th, .md td { border: 1px solid #cbd2da; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
  .md th { background: #eef1f5; color: #000; font-weight: 700; }
  .md tr:nth-child(even) td { background: #f7f9fb; }
  .md img { max-width: 100%; }
`;

// POST /api/pdf — terima { html, title } → render via Chromium → balikan PDF.
export async function POST(req: Request) {
  let html = '';
  let title = '';
  try {
    const body = await req.json();
    html = typeof body?.html === 'string' ? body.html : '';
    title = typeof body?.title === 'string' ? body.title : '';
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 });
  }
  if (!html.trim()) {
    return NextResponse.json({ error: 'HTML kosong' }, { status: 400 });
  }

  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body><div class="md">${html}</div></body></html>`;

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(doc, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        // Sisakan ruang untuk header (atas) & footer (bawah).
        margin: { top: '20mm', bottom: '18mm', left: '14mm', right: '14mm' },
        headerTemplate: `<div style="width:100%; padding:0 14mm; font-size:9px; color:#888; border-bottom:0.5px solid #e0e0e0;">${esc(title)}</div>`,
        footerTemplate: `<div style="width:100%; padding:0 14mm; font-size:9px; color:#999; text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      });
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await page.close();
    }
  } catch (e) {
    // Bila browser mati/ter-corrupt, reset agar percobaan berikutnya me-launch ulang.
    browserPromise = null;
    return NextResponse.json({ error: `Gagal membuat PDF: ${e}` }, { status: 500 });
  }
}
