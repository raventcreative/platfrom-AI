# Content Engine — Prototype (standalone)

Prototipe **satu file** untuk uji coba cepat, tanpa install / database / server.
Ini jalur paling ringan dari [handbook §11 Opsi A](../docs/CONTENT_ENGINE_HANDBOOK.md).

> Untuk versi aplikasi penuh (NestJS + Next.js + Postgres), lihat `apps/` dan
> [DEVELOPMENT.md](../docs/DEVELOPMENT.md). Prototipe ini terpisah & mandiri.

## Cara pakai (30 detik)

1. **Buka** `content-engine.html` — double-click, atau seret ke browser.
2. Klik **Muat contoh** → 2 brand contoh (GlowUp Skincare, Mie Gacoan) muncul.
3. Klik salah satu brand → tab **Generate** → isi fokus hari ini → klik
   **Script / Carousel / Storyboard / Caption / Ide mingguan** atau **⚡ Paket Lengkap**.
4. Hasil muncul sebagai **teks enak-dibaca + blok JSON** dengan tombol **Copy**.

Tanpa API key, prototipe jalan di **mode demo** (output contoh) — cukup untuk
mencoba alurnya. Untuk hasil sungguhan, klik **⚙️ API key** dan isi Anthropic API key
(disimpan di browser kamu saja, `localStorage`).

## Apa yang ada di dalamnya

- **Intake profil brand** per vertikal (modul skincare / F&B muncul sesuai kategori).
- **🧠 Latih AI dari Instagram** (tab Profil): AI menganalisis konten IG brand → mengekstrak
  **brand voice profile** (nada, sapaan, frasa khas, contoh caption asli) → otomatis disuntik
  ke semua generate. Sumber data: **scrape IG handle via Apify** (isi Apify token di ⚙️)
  dan/atau **tempel contoh caption manual** (tanpa token). Field intake (sapaan, signature,
  kata terlarang, emoji, nada) ikut terisi otomatis.
- **Daily input** (fokus harian) → **5 generator** + Paket Lengkap.
- **Knowledge Playbook** + **Compliance** (BPOM / halal / SARA) disuntik ke tiap prompt.
- **Multi-brand** tersimpan di `localStorage` (per browser, tidak sinkron antar perangkat).
- Panggilan LLM langsung dari browser ke Anthropic Messages API + fallback mode demo.

## Catatan

- **AI = drafter, manusia = approver.** Selalu review sebelum posting.
- Data & API key disimpan **hanya di browser ini** (localStorage). Bersihkan lewat
  tombol hapus brand atau clear site data.
- Untuk deploy: upload `content-engine.html` ke shared hosting (rename `index.html`),
  pastikan HTTPS aktif. Lihat [handbook §12](../docs/CONTENT_ENGINE_HANDBOOK.md).
