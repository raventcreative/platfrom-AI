// Unduh HTML markdown ter-render sebagai PDF — dibuat server-side oleh PUPPETEER
// (mesin cetak Chromium asli) lewat route /api/pdf. Pagination native: tidak ada
// baris/kalimat terpotong, header/footer & A4 rapi.
//
// Signature tetap sama (html, filename, title?) supaya semua pemanggil (Content
// Creation, Automation, Riwayat, Insight, IG Research/Insight) tak perlu diubah.

export async function downloadHtmlPdf(html: string, filename: string, title?: string) {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, title: title ?? '' }),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* biarkan status code saja */
    }
    throw new Error(`Gagal membuat PDF: ${msg}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri jeda singkat sebelum revoke agar unduhan sempat mulai.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
