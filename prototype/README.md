# Content Engine — Prototype (standalone)

Aplikasi **satu file** untuk bikin konten sosmed multi-brand — tanpa install, database, atau server.
Didesain supaya siapa pun bisa pakai: onboarding tanya-jawab santai, satu tombol besar per aksi,
hasil dirender rapi (bukan tembok teks).

> Untuk versi aplikasi penuh (NestJS + Next.js + Postgres), lihat `apps/` dan
> [DEVELOPMENT.md](../docs/DEVELOPMENT.md). Prototipe ini terpisah & mandiri.

## Cara pakai (1 menit)

1. **Buka** `content-engine.html` di browser (double-click). Untuk API sungguhan, lebih baik
   lewat server lokal: `python3 -m http.server 8000` → `http://localhost:8000/content-engine.html`.
2. Klik **🎁 Coba pakai brand contoh** (langsung jalan) — atau **➕ Bikin brand-ku** dan jawab
   wizard-nya (±2 menit, bisa dilewati sebagian).
3. Tab **✨ Bikin Konten** → pilih jenis → ceritakan fokus hari ini → **✨ Bikinin!**
4. Tanpa kunci AI, semua jalan di **mode demo** (hasil contoh). Isi kunci di **⚙️** untuk hasil
   sungguhan dari brand-mu.

## Fitur

| Fitur | Isi |
|---|---|
| **Onboarding wizard** | Profil brand via tanya-jawab bertahap: produk, pembeli, gaya bicara, CTA, aturan aman (BPOM/halal), modul per vertikal, sosmed & kompetitor |
| **5 generator + Paket Lengkap** | 🎬 Script video (3 opsi hook + alasan kenapa works + scene + CTA) · 🎠 Carousel (slide cards) · ✍️ Caption+Hashtag · 🎥 Storyboard shoot-pakai-HP · 🗓️ Ide seminggu — semua dengan **catatan pembelajaran** |
| **🔍 Review IG-ku** | AI menilai akunmu: skor per aspek (meter), kekuatan, kelemahan, rekomendasi, quick wins |
| **⚔️ Bandingkan Kompetitor** | Pola hook kompetitor, yang layak ditiru-adaptasi, kelemahan mereka, **celah buat menang**, hook bank yang sudah disesuaikan voice brand-mu |
| **🧠 Latih AI dari Instagram** | AI belajar gaya nulis brand dari kontennya → voice profile disuntik ke semua hasil |
| **Streaming** | Hasil AI mengalir real-time saat ditulis — terasa cepat |
| **Sumber data IG** | Scrape handle via **Apify** (isi token di ⚙️) atau **tempel caption manual** (tanpa token) |

Semua hasil = tampilan terstruktur (kartu hook, tabel scene, slide, meter skor) + tombol **salin**
per bagian. Prinsip: **AI = drafter, manusia = approver** — selalu review sebelum posting.

## Catatan

- Data & kunci disimpan **hanya di browser ini** (localStorage) — tidak sinkron antar perangkat.
- Kunci AI: buat di console.anthropic.com → API Keys (`sk-ant-...`). Model bisa dipilih:
  seimbang (Sonnet), paling cepat (Haiku), paling bagus (Opus).
- Deploy: upload `content-engine.html` ke shared hosting (rename `index.html`), pastikan HTTPS.
  Lihat [handbook §12](../docs/CONTENT_ENGINE_HANDBOOK.md).
