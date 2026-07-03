# design.md — Design System Content Engine

Arah visual: **editorial hangat** — terinspirasi produk seperti sandcastles.ai (bersih, whitespace
lega, tipografi jadi bintang) tapi dengan identitas sendiri: pasir + pinus + koral, serif display,
tekstur grain halus. Sengaja menjauh dari template AI generik (gradien ungu, glassmorphism).

Implementasi: CSS variables di `prototype/content-engine.html` (blok `:root`).

## Warna

| Token | Hex | Pakai untuk |
|---|---|---|
| `--bg` | `#F6F0E3` | latar utama (pasir hangat) |
| `--bg-2` | `#FBF7EC` | latar input/permukaan sekunder |
| `--card` | `#FFFEF9` | kartu |
| `--ink` | `#1C1712` | teks utama, tombol terpilih |
| `--ink-2` / `--ink-3` | `#6C6151` / `#A2947E` | teks sekunder / tersier |
| `--line` / `--line-2` | `#E9DECA` / `#D9CCAE` | border halus / border input |
| `--pine` | `#1C5B43` | **primary**: CTA, progress, skor bagus |
| `--pine-dark` | `#113D2C` | shadow-offset tombol primary |
| `--coral` | `#E4572E` | aksen: badge pola hook, logo dot, skor rendah |
| `--gold` | `#A16207` | peringatan lembut, kotak "Biar makin jago" |
| `--red` | `#B93434` | destruktif (hapus) |

Aturan: pine = aksi & positif, coral = sorotan & atensi (jangan dipakai dua-duanya di satu elemen),
gold = edukasi/peringatan. Skor meter: <5 coral, 5–7.5 gold, >7.5 pine.

## Tipografi

- **Display/serif**: `Fraunces` (opsz 9–144; weight 700/900; italic untuk penekanan `em.fancy`
  berwarna pine). Dipakai: h1–h4, judul hasil, headline slide, angka skor besar.
- **Body/sans**: `Plus Jakarta Sans` (400–800). Dipakai: semua teks lain, tombol, label.
- Skala: hero `clamp(36px, 6.4vw, 62px)` weight 900; judul section 20px; body 15.5px/1.6;
  tiny 12.5px. Letter-spacing negatif tipis di serif (−.015em).

## Bentuk & kedalaman

- Radius: kartu 22px, input/kotak 16px, tombol & pill 999px (penuh).
- Shadow: dua level (`--sh-1` istirahat, `--sh-2` hover) — lembut, warna ink transparan.
- **Tombol offset-shadow**: `box-shadow: 0 3px 0 <warna-dark>` + naik 1.5px saat hover, turun saat
  ditekan — kesan taktil tanpa berat.
- Grain: overlay `feTurbulence` SVG (opacity .35, multiply) di `body::before` — mencegah flat.

## Komponen inti

| Komponen | Ciri |
|---|---|
| **Pill selector** | pilihan sekali-tap; state aktif = ink solid teks pasir |
| **Chip saran** (`.sugg`) | border putus-putus, tap-to-fill — pengganti ngetik di onboarding & topik |
| **Step label** | angka bulat pine + judul tebal ("1 · Mau bikin apa?") |
| **Type card** | emoji besar + judul + deskripsi 2 baris; hover terangkat; aktif = pine-soft |
| **Timeline adegan** (`.beat`) | kolom waktu (badge `0–3s`) + visual/VO/teks-di-layar |
| **Phone preview** (`.phone`) | rasio 4:5, border ink + offset shadow; slide dengan role label, headline serif, arahan visual italic |
| **Meter skor** | label + bar + angka; warna mengikuti nilai — angka selalu ditampilkan, bukan warna doang |
| **Learn box** (`.learn`) | latar gold-soft "💡 Biar makin jago:" — edukasi di tiap hasil |
| **Kalender minggu** (`.week`) | 7 kartu hari: pillar badge, hook serif, konsep, format + CTA |
| **Wizard** | satu pertanyaan per layar, progress bar pine, emoji besar, Enter = lanjut |

## Motion

- Masuk view: `rise` 380ms cubic-bezier(.2,.7,.3,1) — naik 14px + fade.
- Pop elemen (emoji wizard, slide preview): `pop` 250–400ms.
- Orb "lagi nyusun": pulse 1.1s + teks tahapan berganti tiap ~380ms (proses generate dibuat terasa
  ±1.2 detik agar hasil terasa "dikerjakan", padahal instan).
- Hover kartu: translateY(−3px) + shadow naik, 130ms.

## Voice UI (microcopy)

- Bahasa Indonesia santai-sopan, kalimat pendek, tanpa jargon: "Bikinin sekarang!", "Yang bocor",
  "Quick wins minggu ini", "kosongin = kami pilihkan".
- Selalu jelaskan *kenapa* (hook punya "Kenapa works:", hasil punya catatan pembelajaran).
- Emoji sebagai penanda fungsi (🎬 🎠 ✍️ 🎥 🗓️ 🩺 🥊), bukan hiasan acak.
- Standar: siapa pun — termasuk yang gaptek — paham layar dalam sekali baca.

## Responsif

- Breakpoint tunggal 680px: grid 2 kolom → 1, meter menyempit, phone preview center.
- Semua grid `auto-fill/minmax` — tidak ada lebar fix di atas 250px; tabel lebar dibungkus
  `.tscroll` (scroll horizontal lokal, halaman tidak pernah scroll samping).
