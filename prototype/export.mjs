#!/usr/bin/env node
/**
 * export.mjs — export hasil generate Content Engine ke PNG + PDF (pakai Puppeteer).
 *
 * Menjalankan content-engine.html di headless Chrome, men-seed brand contoh,
 * meng-generate satu jenis konten, lalu menyimpan:
 *   - <out>/<brand>-<type>.pdf         (kartu hasil, siap dibagikan/print)
 *   - <out>/<brand>-<type>-result.png  (screenshot kartu hasil)
 *   - <out>/<brand>-<type>-slide-*.png (tiap gambar mockup / referensi foto)
 *
 * Pakai:
 *   node prototype/export.mjs [type] [brandIndex] [outDir]
 *   type       : script | carousel | caption | storyboard | ideas   (default carousel)
 *   brandIndex : 0 = GlowUp Skincare, 1 = Bakso Juara               (default 0)
 *   outDir     : folder output                                       (default ./export-out)
 *
 * Contoh: node prototype/export.mjs carousel 0 ./out
 *
 * Butuh Google Chrome terpasang (dipakai lewat puppeteer-core). Set CHROME_PATH
 * kalau lokasinya non-standar.
 */
import puppeteer from 'puppeteer-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Baca dimensi (w,h) dari marker SOF JPEG.
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 1000, h: 1000 };
}
// Rakit PDF multi-halaman: satu gambar JPEG per halaman (Filter DCTDecode).
function buildPdf(images) {
  const parts = []; const offsets = {}; let cursor = 0;
  const push = b => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); parts.push(buf); cursor += buf.length; };
  const startObj = id => { offsets[id] = cursor; push(id + ' 0 obj\n'); };
  const endObj = () => push('endobj\n');
  push('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  startObj(1); push('<< /Type /Catalog /Pages 2 0 R >>\n'); endObj();
  const kids = images.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  startObj(2); push(`<< /Type /Pages /Kids [${kids}] /Count ${images.length} >>\n`); endObj();
  images.forEach((im, i) => {
    const pageId = 3 + i * 3, contentId = 4 + i * 3, imgId = 5 + i * 3;
    const pw = 595.28, ph = Math.round(pw * im.h / im.w * 100) / 100;
    const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q\n`;
    startObj(pageId); push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\n`); endObj();
    startObj(contentId); push(`<< /Length ${content.length} >>\nstream\n`); push(content); push('endstream\n'); endObj();
    startObj(imgId); push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`); push(im.jpeg); push('\nendstream\n'); endObj();
  });
  const xrefStart = cursor;
  const maxId = 2 + images.length * 3;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) xref += String(offsets[id] || 0).padStart(10, '0') + ' 00000 n \n';
  push(xref);
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return Buffer.concat(parts);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = pathToFileURL(join(__dirname, 'content-engine.html')).href;

const TYPE = process.argv[2] || 'carousel';
const BRAND = parseInt(process.argv[3] || '0', 10) || 0;
const OUT = resolve(process.argv[4] || join(process.cwd(), 'export-out'));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find(p => existsSync(p));
if (!chromePath) {
  console.error('❌ Google Chrome tidak ketemu. Set CHROME_PATH ke lokasi Chrome kamu.');
  process.exit(1);
}

const slug = s => String(s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'brand';

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--disable-gpu'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1400, deviceScaleFactor: 2 });
  // font Google dari jaringan bisa bikin networkidle menggantung → cukup domcontentloaded
  await page.goto(HTML, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#app') && document.querySelector('#app').children.length > 0, { timeout: 15000 });

  // Seed brand + generate satu jenis konten via API internal aplikasi.
  const brandName = await page.evaluate(async ({ type, brand }) => {
    localStorage.clear();
    seedClients();
    const c = loadClients()[brand] || loadClients()[0];
    openBrand(c.id, 'bikin');
    pickedType = type;
    // set platform IG Feed biar keluar 8 referensi foto juga (kalau relevan)
    const pf = document.querySelector('#g_platform');
    if (pf) { pf.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.v === 'IG Feed')); }
    await doGenerate(c);
    // rapikan: sisakan hanya kartu hasil biar screenshot bersih
    document.querySelectorAll('#app .view > *').forEach(e => {
      if (!e.querySelector('.result-card') && !e.classList.contains('result-card')) e.style.display = 'none';
    });
    document.querySelector('header.top').style.display = 'none';
    window.scrollTo(0, 0);
    return c.name;
  }, { type: TYPE, brand: BRAND });

  // matikan overlay grain + animasi biar render stabil untuk screenshot
  await page.addStyleTag({ content: 'body::before{display:none!important} *{animation:none!important;transition:none!important}' });
  await new Promise(r => setTimeout(r, 800)); // beri waktu <img> mockup ter-render
  const base = join(OUT, `${slug(brandName)}-${TYPE}`);

  const pdfPages = []; // {jpeg, w, h} untuk PDF multi-halaman

  // 1) kartu hasil → PNG + halaman pertama PDF
  const card = await page.$('.result-card');
  if (card) {
    await card.screenshot({ path: `${base}-result.png` });
    const jpeg = Buffer.from(await card.screenshot({ type: 'jpeg', quality: 85 }));
    pdfPages.push({ jpeg, ...jpegSize(jpeg) });
  }

  // 2) tiap gambar mockup + referensi foto → PNG + halaman PDF
  const imgs = await page.$$('.mockup img, .feedcell img');
  let n = 0;
  for (const img of imgs) {
    n += 1;
    try {
      await img.screenshot({ path: `${base}-img-${String(n).padStart(2, '0')}.png` });
      const jpeg = Buffer.from(await img.screenshot({ type: 'jpeg', quality: 85 }));
      pdfPages.push({ jpeg, ...jpegSize(jpeg) });
    } catch (_) {}
  }

  // 3) rakit PDF sendiri dari JPEG (embed DCTDecode) — andal & offline
  let pdfOk = false;
  try {
    if (pdfPages.length) { await writeFile(`${base}.pdf`, buildPdf(pdfPages)); pdfOk = true; }
  } catch (e) { console.warn('⚠️ PDF gagal: ' + e.message.slice(0, 60)); }

  await browser.close();
  console.log(`✅ Export selesai untuk "${brandName}" (${TYPE}) → ${OUT}`);
  if (pdfOk) console.log(`   • ${base}.pdf  (${pdfPages.length} halaman)`);
  console.log(`   • ${base}-result.png`);
  console.log(`   • ${n} gambar (${base}-img-*.png)`);
}

main().catch(e => { console.error('❌ Export gagal:', e.message); process.exit(1); });
