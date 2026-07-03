# Content Engine — Prototype v3 (standalone, tanpa API key)

Aplikasi **satu file** untuk bikin konten sosmed multi-brand — tanpa install, tanpa database,
tanpa server, dan **tanpa kunci AI**. Semua hasil dirakit instan (<2 detik) oleh *mesin generator
lokal* di browser: profil brand-mu + bank copywriting per kategori + pola hook teruji.

> Untuk versi aplikasi penuh (NestJS + Next.js + Postgres), lihat `apps/` dan
> [DEVELOPMENT.md](../docs/DEVELOPMENT.md). Prototipe ini terpisah & mandiri.

## Cara pakai (1 menit)

1. **Buka** `content-engine.html` di browser (double-click, langsung jalan).
2. Klik **🎁 Coba brand contoh** — atau **Mulai** dan jawab wizard-nya (±3 menit,
   satu pertanyaan per layar, banyak contoh tinggal tap).
3. Tab **✨ Bikin Konten** → pilih jenis → (opsional) tulis topik → **✨ Bikinin sekarang!**
4. Nggak suka hasilnya? Klik **🎲 Versi lain** — variasi baru, tetap gaya brand-mu.

## Fitur

| Fitur | Isi |
|---|---|
| **Onboarding wizard** | 11 layar ringan: produk, pembeli, masalah & impian mereka, gaya bicara, CTA, aturan aman (auto-prefill BPOM/halal per kategori), kompetitor. Chip saran per kategori — minim ngetik |
| **5 generator + Paket Lengkap** | 🎬 Script video (3 opsi hook + kenapa works + timeline adegan + CTA) · 🎠 Carousel (preview HP + slide list) · ✍️ Caption + hashtag (panjang, pendek, 5 hook cadangan) · 🎥 Storyboard shoot-pakai-HP · 🗓️ Ide seminggu (rasio sehat 80/20) — semua dengan **catatan pembelajaran** |
| **🩺 Review akun IG** | Tempel caption-mu → analisis teks sungguhan: skor hook 3 detik, CTA, hashtag, keterbacaan, variasi pillar — dengan bukti dikutip dari caption-mu |
| **🥊 Bandingkan kompetitor** | Tempel caption mereka → tabel skor kamu-vs-mereka, pola hook mereka, yang layak ditiru-adaptasi, kelemahan mereka, **celah yang belum digarap**, bank hook siap pakai dengan voice brand-mu |
| **Riwayat** | 20 hasil terakhir per brand, bisa dibuka ulang kapan pun |
| **Compliance otomatis** | Kata terlarang brand & klaim berisiko (BPOM dsb) otomatis diganti versi aman di semua output |

Semua hasil = tampilan terstruktur (kartu hook, timeline, preview HP, meter skor) + tombol
**salin** per bagian. Prinsip: **generator = drafter, manusia = approver** — review sebelum posting.

## Ganti / aktifkan model AI (opsional)

Klik **⚙️** di kanan atas:

- **Kosongkan kunci** → mode **lokal** (default): mesin generator instan, gratis, jalan tanpa
  internet. Badge header: `⚡ instan`.
- **Isi kunci AI** (`sk-ant-…` Claude atau `sk-…` OpenAI) → hasil generator **disempurnakan model**.
  Provider terdeteksi otomatis. Kalau AI gagal/format tak sesuai, otomatis **balik ke mesin lokal**
  (tidak pernah nge-blank). Badge header: `🤖 AI aktif`.
- **Kualitas vs kecepatan**: cepat / seimbang / bagus → memilih model default per provider
  (mis. Claude: `claude-haiku-4-5` / `claude-sonnet-5` / `claude-opus-4-8`).
- **Nama model manual**: isi kalau mau model spesifik (mis. `claude-fable-5`, `gpt-4o`).

Kunci disimpan di browser ini saja; hanya dikirim ke provider AI-nya. Fitur Riset (review &
kompetitor) tetap dianalisis lokal.

## Catatan

- Data & kunci disimpan **hanya di browser ini** (localStorage) — tidak dikirim ke server kami.
- Mesin generator lokal 100% deterministik (seed) — hasil sama bisa direproduksi, tombol 🎲
  memberi variasi baru.
- Deploy: upload `content-engine.html` ke hosting mana pun (rename `index.html`).
