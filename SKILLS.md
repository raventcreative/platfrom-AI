# skills.md — Katalog Skill Content Engine

Setiap skill = satu kemampuan menghasilkan/menganalisis konten, dengan kontrak input → output yang
jelas. Implementasi sekarang: mesin lokal di `prototype/content-engine.html`. Kontrak ini juga jadi
spesifikasi prompt ketika nanti disambungkan ke LLM.

Semua skill menerima konteks yang sama:

- **Brand Profile** — nama, kategori, produk, harga, USP, bukti, pembeli, pain point, impian,
  tone, sapaan, emoji, frasa khas, kata terlarang, tujuan, CTA, promo, aturan aman.
- **Daily Input** — topik (opsional), tujuan, platform, durasi.
- **Seed** — bilangan variasi (tombol 🎲 menaikkan seed).

---

## 🎬 Script Video (Reels/TikTok)
- **Fungsi**: `genScript`
- **Output**: 3 opsi hook (pola berbeda + alasan kenapa works) · timeline adegan (visual, voiceover,
  teks di layar, durasi per detik) · 1 CTA · saran sound · catatan pembelajaran.
- **Aturan kualitas**: value mulai detik 0 (tanpa salam); formula dipilih dari tujuan —
  Jualan→PAS, Edukasi→Tips berangka / Mitos-vs-Fakta, Interaksi→POV skit, Awareness→Story brand;
  ganti visual tiap 5–8 detik (pattern interrupt); total durasi tepat sesuai pilihan (15/30/45s).

## 🎠 Carousel Instagram
- **Fungsi**: `genCarousel`
- **Output**: 6–8 slide (role: hook/isi/cta; headline ≤8 kata + subteks + arahan visual) ·
  2 alternatif cover · caption + 4–5 hashtag · preview HP interaktif.
- **Aturan kualitas**: slide 1 = 80% bobot (angka + curiosity gap); satu ide per slide;
  slide akhir minta SAVE (bobot ~3x like); mode promo punya alur sendiri
  (hook → alasan → isi → bukti → harga → CTA).

## ✍️ Caption + Hashtag
- **Fungsi**: `genCaption`
- **Output**: caption utama 150–200 kata (baris pendek) · caption pendek · 5 hook cadangan
  (pola berbeda) · 4–5 hashtag.
- **Aturan kualitas**: hook di 125 karakter pertama; formula per tujuan (AIDA/PAS/BAB/Relatable);
  tepat satu CTA; hashtag campuran niche + topik + branded + lokal, tanpa mega-tag.

## 🎥 Storyboard
- **Fungsi**: `genStoryboard`
- **Output**: konsep 1 kalimat · shot list (visual, kamera, talent/props, VO, teks, musik, durasi) ·
  daftar b-roll · catatan produksi (lighting, lokasi, estimasi waktu).
- **Aturan kualitas**: realistis dishoot 1–2 orang pakai HP + tripod; format dipilih per kategori
  (before-after untuk jasa, reaksi first-bite untuk F&B, dst); angle before/after harus identik.

## 🗓️ Ide Seminggu
- **Fungsi**: `genIdeas`
- **Output**: 7 ide (hari, pillar, format, hook, konsep konkret, CTA) dalam kalender.
- **Aturan kualitas**: rasio 80/20 dikunci — 5 konten memberi (edukasi ×2, social proof, BTS,
  hiburan, komunitas) : 2 meminta; format bervariasi (Reels/Carousel/Story).

## 🩺 Review Akun IG *(analisis, bukan generasi)*
- **Fungsi**: `reviewReport`
- **Input**: 2+ caption asli user (dipisah `---`).
- **Output**: skor total + 5 meter (hook 3 detik, CTA, hashtag, keterbacaan, variasi pillar) ·
  tabel per-post · kekuatan/kelemahan dengan kutipan bukti · rekomendasi · 3 quick wins.
- **Metode**: deteksi pola nyata — pembuka basa-basi, pola hook (angka/POV/pertanyaan/warning/…),
  regex CTA, jumlah & jenis hashtag (mega-tag ditandai), jeda baris, klasifikasi pillar.

## 🥊 Bandingkan Kompetitor *(analisis + generasi)*
- **Fungsi**: `compareReport`
- **Input**: caption user (opsional) + caption 1–3 kompetitor.
- **Output**: tabel skor kamu-vs-mereka · per kompetitor: pola hook terdeteksi, yang layak
  ditiru-adaptasi, kelemahan · celah konten (dari `GAP_PLAYS`) yang belum digarap siapa pun ·
  bank 6 hook dengan voice brand user · 5 langkah menang.
- **Prinsip**: tiru polanya, jangan kalimatnya; menang di celah, bukan di format yang sama.

---

## Skill fondasi (dipakai semua skill di atas)

| Skill | Fungsi | Peran |
|---|---|---|
| Hook Patterns | `HOOKS`, `makeHooks` | 12 pola hook (POV, warning, listicle, mitos, curiosity, before-after, call-out, angka kejut, kejujuran radikal, …) diisi fakta brand |
| Voice & Tone | `TONES`, `factsOf` | 6 tone (santai/lucu/edukatif/premium/bold/hangat) memengaruhi diksi, closer, dan emoji |
| Hashtag Builder | `buildHashtags` | niche + topik + branded + lokal, 4–5 tag, tanpa mega-tag |
| Compliance | `sanitize`, `SAFE_SWAPS` | ganti klaim berisiko dengan versi aman; blokir kata terlarang brand |
| Bank Konten | `BANK` | per kategori: kesalahan, tanda, mitos, tips, topik, visual, hashtag, saran onboarding |
