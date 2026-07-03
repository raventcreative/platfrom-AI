# agents.md — Peta Agent Content Engine

Dokumen ini mendefinisikan "agent" (peran otomatis) di Content Engine: apa tugasnya, input/output-nya,
dan di mana implementasinya sekarang. Saat ini semua agent berjalan sebagai **mesin lokal deterministik**
di `prototype/content-engine.html` (tanpa API key). Ketika API key model tersedia, tiap agent di bawah
bisa di-upgrade jadi panggilan LLM dengan kontrak input/output yang sama — UI tidak perlu berubah.

## Prinsip umum

- **Agent = drafter, manusia = approver.** Semua output harus direview user sebelum diposting.
- **Semua agent membaca Brand Profile** (hasil onboarding) sebagai konteks wajib: produk, pembeli,
  pain point, gaya bicara, sapaan, CTA, promo, kata terlarang.
- **Compliance duluan.** Output apa pun melewati `sanitize()`: kata terlarang brand + klaim berisiko
  (BPOM/halal) diganti versi aman sebelum tampil.
- **Deterministik + variatif.** Setiap generate memakai seed (`mulberry`) — hasil bisa direproduksi,
  tombol 🎲 menaikkan seed untuk variasi.

## Daftar agent

### 1. Brand Profiler (onboarding)
- **Tugas**: mengubah jawaban wizard 11 layar jadi Brand Profile terstruktur; prefill aturan aman
  per kategori; menghitung skor kekuatan profil.
- **Input**: jawaban user (banyak via tap chip, minim ngetik).
- **Output**: objek client di localStorage (`ce3_clients`).
- **Implementasi**: `WIZ_STEPS`, `wizNext()`, `profileStrength()`.

### 2. Content Strategist (generator konten)
- **Tugas**: merakit 5 jenis konten dari Brand Profile + input harian (topik, tujuan, platform, durasi).
- **Sub-skill**: script video, carousel, caption+hashtag, storyboard, ide seminggu — detail di
  [skills.md](skills.md).
- **Output**: objek terstruktur (bukan teks bebas) → dirender jadi timeline/preview/kalender.
- **Implementasi**: `genScript`, `genCarousel`, `genCaption`, `genStoryboard`, `genIdeas`, registry `TYPES`.

### 3. Account Auditor (review IG)
- **Tugas**: menganalisis caption asli milik user — skor hook 3 detik, CTA, hashtag, keterbacaan,
  variasi pillar — lalu menyusun kekuatan/kelemahan (dengan kutipan bukti), rekomendasi, quick wins.
- **Input**: caption 5–10 post (dipisah `---`).
- **Output**: `reviewReport` → meter skor + tabel per-post + daftar aksi.
- **Sifat**: analisis teks nyata (regex/heuristik), bukan generasi — hasil bisa dipertanggungjawabkan.
- **Implementasi**: `analyzePost`, `analyzeAccount`, `reviewReport`.

### 4. Competitor Analyst (perbandingan)
- **Tugas**: membandingkan akun user vs sampai 3 kompetitor; mendeteksi pola hook mereka, kebiasaan
  yang layak ditiru-adaptasi, kelemahan mereka, dan **celah konten** yang belum digarap siapa pun;
  menyusun bank hook siap pakai dengan voice brand user.
- **Input**: caption user (opsional) + caption kompetitor per akun.
- **Output**: `compareReport` → tabel skor, insight per kompetitor, gap, hook bank, 5 langkah menang.
- **Implementasi**: `compareReport`, `GAP_PLAYS`.

### 5. Compliance Guard (lintas agent)
- **Tugas**: menjaga semua output aman — skincare tanpa klaim medis (BPOM), F&B tanpa klaim
  kesehatan, tanpa superlatif kosong; kata terlarang brand tidak pernah muncul.
- **Implementasi**: `SAFE_SWAPS`, `sanitize()`, `forbiddenDefault`/`certDefault` per kategori di `BANK`.

## Rencana upgrade ke LLM (nanti, saat API key ada)

1. Tiap `gen*`/`*Report` dipromosikan jadi prompt LLM dengan **skema output JSON yang sama** —
   renderer tidak berubah.
2. Mesin lokal tetap dipakai sebagai **fallback offline** dan sebagai few-shot contoh dalam prompt.
3. Tambahan agent baru yang butuh LLM: Brand Voice Trainer (ekstrak voice dari caption IG) dan
   Hook Rewriter (tulis ulang hook user).
