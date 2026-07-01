// Ekspor HTML markdown yang sudah ter-render menjadi PDF A4 (tema terang,
// enak dicetak). Dipakai tombol "Download PDF" di hasil generate.

export async function downloadHtmlPdf(html: string, filename: string, title?: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Kontainer offscreen bertema terang agar PDF bersih & mudah dibaca.
  const holder = document.createElement('div');
  holder.className = 'md pdf-export';
  holder.innerHTML = (title ? `<h1>${escapeHtml(title)}</h1>` : '') + html;
  holder.style.cssText =
    'position:fixed;left:-99999px;top:0;width:760px;padding:36px;background:#ffffff;';
  document.body.appendChild(holder);

  try {
    const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const img = canvas.toDataURL('image/png');

    let remaining = imgH;
    let position = 0;
    pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
    remaining -= pageH;
    while (remaining > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
      remaining -= pageH;
    }
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(holder);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}
