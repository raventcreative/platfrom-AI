# Content Engine — Project Handbook

> **Spec MVP near-term ProdPilot.** Sistem otomasi konten harian untuk agency yang
> memegang banyak brand klien (skincare, F&B, fashion, jasa, dll). Dokumen ini berisi
> semua yang dibutuhkan untuk membangun ulang sistem ini dari nol: konsep, template
> pertanyaan, prompt AI, knowledge base, aturan compliance, kode inti, dan cara deploy.
>
> Dibuat: 2026 · Bahasa output sistem: **Indonesia.**

---

## 1. Ringkasan & Keputusan

**Masalah:** Agency bikin konten harian untuk banyak klien. Bagian bikin script tiap pagi masih manual & makan waktu.

**Solusi:** Tim isi profil brand satu kali per klien (template intake), lalu tiap pagi tinggal generate — AI mengeluarkan script Reels, carousel, storyboard video, caption+hashtag, dan ide konten, dengan gaya yang nempel ke tiap brand dan aman secara aturan (BPOM/halal/SARA).

**Keputusan kunci:**

- Dibangun bertahap: (1) template + prompt, (2) web app multi-klien, (3) automation tiap pagi.
- Output: script video/reels, carousel IG, storyboard video, caption+hashtag+ide judul, ide konten mingguan. Extensible.
- AI jalan di dalam aplikasi sendiri (panggil LLM API), bukan tool eksternal.
- Multi-client: simpan & kelola banyak profil brand.
- Kualitas dinaikkan lewat **knowledge base** (best-practice hook/script/carousel/copywriting + pasar Indonesia + compliance) yang disuntik ke prompt tiap generate.
- Dua bentuk pemaketan: (a) **web app Node.js** (key di server, data share — untuk VPS); (b) **satu file HTML standalone** (key di browser, data localStorage — untuk shared hosting / double-click).

**Prinsip:** AI = drafter, manusia = approver. Selalu ada review sebelum posting. Compliance dulu (skincare tidak boleh over-claim BPOM; F&B jelas halal/lokasi).

---

## 2. Arsitektur & Alur

**Alur end-to-end:**

```
Intake brand (1x per klien)  ->  Profil brand tersimpan
        |
        v
"AI yang dilatih" = System Prompt + Profil Brand + Knowledge Playbook + Compliance
        |
Daily Input (tiap pagi: fokus hari ini)  ->  pilih jenis output  ->  AI GENERATE
        |
Output (teks enak-dibaca + blok JSON terstruktur)
        |
Review & Approve (manusia)  ->  Posting
```

**Komponen:**

- **Intake schema** — definisi pertanyaan profil brand (jadi sumber form).
- **System prompt** — persona AI + profil brand + playbook + compliance per-vertikal + self-check.
- **Generators** — instruksi per jenis output (script/carousel/storyboard/caption/ideas).
- **LLM caller** — panggil Anthropic Messages API; fallback "mode demo" kalau tidak ada API key.
- **Storage** — profil klien (file JSON di server, atau localStorage di browser).
- **UI** — dashboard klien, form intake dinamis, panel generate, hasil + tombol copy.
- **Automation** — script "morning run": loop semua klien, generate paket, tulis ke folder output, dijadwalkan cron/GitHub Action.

---

## 3. Template Intake — Profil Brand (diisi 1x per klien)

Tanda **(\*)** = wajib. Modul per-vertikal muncul sesuai kategori.

### 1. Identitas Brand
- **(\*)** Nama brand
- Tagline / jargon
- **(\*)** Kategori / industri: Skincare/Beauty · F&B/Resto · Fashion/Retail · Jasa/Service · Lainnya
- **(\*)** Area / pasar yang dilayani
- Akun sosial aktif (IG/TikTok + handle)

### 2. Produk / Jasa
- **(\*)** Produk/jasa unggulan (1–3 + deskripsi singkat)
- **(\*)** Range harga
- **(\*)** Masalah/keinginan pelanggan yang diselesaikan
- **(\*)** USP / pembeda utama
- Bukti/keunggulan konkret (terjual sekian, BPOM, garansi)

### 3. Target Audience
- **(\*)** Pembeli utama (umur, gender, status, pekerjaan)
- Lokasi & kelas daya beli
- **(\*)** Pain point / kekhawatiran audiens
- Keinginan / aspirasi audiens
- **(\*)** Gaya bahasa audiens + contoh kata (formal/santai/gaul)
- Platform utama (IG/TikTok)

### 4. Brand Voice & Tone
- **(\*)** Nada brand: Edukatif · Santai/Friendly · Lucu/Relatable · Premium/Elegan · Tegas/Bold · Hangat/Caring
- **(\*)** Sapaan ke audiens (kamu/kak/bestie/gais/Anda)
- Frasa WAJIB dipakai (signature)
- **(\*)** Frasa TERLARANG
- **(\*)** 2–3 contoh caption yang disukai (untuk ditiru gayanya)
- Penggunaan emoji (banyak/secukupnya/none)

### 5. Positioning & Kompetitor
- Kompetitor utama (1–3)
- Pembeda dari kompetitor
- Posisi di pasar

### 6. Tujuan Konten & CTA
- **(\*)** Tujuan utama konten: Awareness · Engagement · Jualan/Konversi · Edukasi
- **(\*)** CTA / aksi yang diinginkan (DM order, checkout link bio, save & share)
- Kontak / link order
- Promo yang sedang jalan

### 7. Compliance & Constraints
- **(\*)** Klaim yang TIDAK BOLEH dipakai
- **(\*)** Hal sensitif yang dihindari (SARA, body shaming)
- Legal/sertifikasi yang boleh disebut (BPOM, Halal MUI)
- Warna brand & font
- Elemen wajib di tiap konten (logo, watermark, disclaimer)

### 8. Referensi & Aset
- Konten yang pernah perform bagus (link + alasan)
- Akun kiblat / inspirasi
- Aset yang tersedia (foto produk, video, footage, model)

### 9. Modul per-vertikal (sesuai kategori)
- **Skincare/Beauty:** Kandungan unggulan & manfaatnya · Tipe kulit/masalah yang disasar · Cara pakai/urutan · Status izin (BPOM no.) · Klaim AMAN & DILARANG
- **F&B/Resto:** Menu andalan + harga · Jam buka & hari · Lokasi/cabang/area delivery · Channel order (GoFood/GrabFood/ShopeeFood/WA/dine-in) · Status halal/alergen · Angle visual makanan · Promo rutin
- **Generik (Fashion/Jasa/Lainnya):** Koleksi/produk/jasa utama + harga · Momen pakai/use case · Ukuran/varian/stok · Hal teknis yang sering ditanya

---

## 4. Daily Input (diisi setiap pagi, 1–2 menit)

- Tanggal hari ini
- **(\*)** Fokus hari ini (produk/promo/edukasi/momen/brand story)
- **(\*)** Detail fokus (mis. "promo bundling 2 serum 99k sampai Minggu")
- **(\*)** Tujuan hari ini (Awareness/Engagement/Jualan/Edukasi)
- Momen/event relevan (gajian, Ramadan, weekend, cuaca panas, tanggal cantik)
- Angle/hook yang mau dicoba (POV, mitos vs fakta, "jangan beli kalau…")
- Jenis output yang dibutuhkan (script/carousel/storyboard/caption)
- Platform tujuan (IG Reels/TikTok/Feed)
- Catatan khusus (stok menipis, produk baru, hindari topik X)

---

## 5. System Prompt (template inti AI)

Tempel sebagai system prompt. `{{BRAND_PROFILE}}` = jawaban intake dalam format "Label: nilai". `{{PLAYBOOK}}` = isi Bagian 6. `{{COMPLIANCE_FOCUS}}` = aturan compliance sesuai vertikal (Bagian 7).

```
Kamu adalah Content Strategist & Copywriter senior untuk sebuah agency konten di Indonesia.
Tugasmu: bikin konten media sosial harian yang nempel banget sama karakter brand klien di
bawah, dengan kualitas tinggi & aman secara aturan.

================ PROFIL BRAND ================
{{BRAND_PROFILE}}
=============================================

{{PLAYBOOK}}

ATURAN MAIN: pakai Bahasa Indonesia sesuai voice & tone brand; pakai sapaan brand; wajib
pakai signature phrases kalau ada; HARAM pakai kata terlarang brand; selalu bicara ke target
audience (sentuh pain point); tutup dengan CTA brand kecuali daily input minta lain.

{{COMPLIANCE_FOCUS}}

OUTPUT: ikuti format yang diminta (versi enak-dibaca + blok JSON valid).

SEBELUM FINAL, lakukan SELF-CHECK cepat: (1) hook nampol di 3 detik? (2) ada tepat 1 CTA
jelas? (3) skincare: nggak ada klaim terlarang/superlatif, hasil dibingkai "tampak/membantu"?
(4) sesuai voice & kata terlarang brand? (5) nggak ngarang angka? Kalau ada yang gagal,
perbaiki dulu baru keluarkan.
```

---

## 6. Knowledge Playbook (disuntik ke system prompt)

```
PLAYBOOK KONTEN (pakai buat SEMUA output):

A. HOOK (3 detik pertama = penentu; ~50% orang skip kalau lemah). Pilih pola kuat:
   curiosity gap, bold/contrarian, "stop ngelakuin X", pertanyaan, warning/negativity,
   POV relatable, listicle berangka, before/after, "gue coba X N hari", relatable struggle,
   angka kejut, call-out niche. Teks on-screen hook 4-7 kata, mulai dari frame paling menarik.

B. STRUKTUR (retensi): Hook(0-3s) -> Build (value baru tiap 5-8 detik, ada pattern-interrupt)
   -> Payoff konkret (angka/hasil) -> 1 CTA. Value mulai detik 0, no "halo guys". Loop ending
   kalau bisa.

C. PANJANG: Reels 7-15s / TikTok ~24-38s. Jangan dipanjangin kalau ide pendek.

D. COPYWRITING (pilih sesuai kesadaran audiens): PAS (Problem-Agitate-Solve) buat hook;
   AIDA buat jualan; BAB (Before-After-Bridge) buat transformasi; FAB (Feature-Advantage-
   Benefit) buat fitur; 4U buat najemin judul. Hybrid: PAS->FAB->AIDA.

E. CAROUSEL: 6-8 slide. Slide 1 cover/hook (5-8 kata + curiosity gap = 80% bobot).
   1 ide/slide, teks ringkas. Slide akhir recap + 1 CTA. Optimalkan SAVE & SHARE (bobot 3x
   like) -> bikin save-worthy (checklist/framework). Kasih cue swipe.

F. CAPTION: hook di 125 karakter pertama; body 150-200 kata, baris pendek; 1 CTA spesifik
   (= ~3x lebih banyak komen).

G. HASHTAG: 3-5 saja (IG batasi 5). Campur niche + topik + branded + lokal. Mid-tier
   (10K-500K) > mega-tag.

H. CTA per tujuan: Jualan -> "komen [KEYWORD] nanti di-DM" / "checkout link bio";
   Engagement -> pertanyaan / "tim mana?"; Save -> "save dulu biar gak lupa";
   Share -> "tag temen yang butuh".

I. CONTENT PILLARS (80% value / 20% jualan): Edukasi, Hiburan, Promosi, Social proof/
   testimoni, Behind-the-scenes, Komunitas. Jangan tiap konten jualan.

J. BAHASA INDONESIA: default casual & relatable (sesuai voice brand). Slang lazim bila cocok:
   kak/bestie/gais, racun, spill, POV, wajib cobain, gaskeun/kuy/yuk, checkout/co, glow up,
   cuan. Konten lokal & relatable > formal/Inggris. Autentik > over-produksi. Jam puncak
   belanja 19-22 WIB.
```

---

## 7. Compliance per Vertikal (`{{COMPLIANCE_FOCUS}}`)

### Skincare/Beauty (aturan BPOM — PerBPOM 18/2024 & 3/2022)

```
COMPLIANCE SKINCARE (WAJIB - aturan BPOM): Kosmetik hanya klaim PENAMPILAN, BUKAN
menyembuhkan penyakit. DILARANG: "menyembuhkan/obat", "memutihkan", "menghilangkan permanen",
superlatif (paling/ter-/nomor 1/100%/terbaik), persona dokter/jas lab. GANTI dgn kata aman:
"membantu merawat/menyamarkan tampilan/mencerahkan", "kulit TAMPAK/TERASA lebih...". Hanya
produk ber-BPOM. Jangan glorifikasi merkuri/hidrokuinon/tretinoin/steroid.
```

**Tabel klaim AMAN vs DILARANG (skincare):**

| DILARANG / RISIKO | GANTI JADI |
|---|---|
| "Menyembuhkan jerawat" / "obat jerawat" | "Membantu merawat kulit berjerawat / tampak lebih bersih" |
| "Menghilangkan bekas jerawat permanen" | "Membantu menyamarkan tampilan bekas jerawat" |
| "Memutihkan kulit" | "Membantu mencerahkan / kulit tampak lebih cerah" |
| "Menghilangkan keriput total" | "Membantu menyamarkan tampilan garis halus" |
| "Menyembuhkan eksim/psoriasis" | (hindari total — penyakit = ranah obat) |
| "100% ampuh / nomor 1 / terbaik" | hapus superlatif, pakai "membantu…" |
| "Direkomendasikan dokter" + atribut medis | testimoni user/opini creator, tanpa persona medis |
| "Sembuh dalam 3 hari dijamin" | "Kulit terasa lebih lembap sejak pemakaian pertama" |

> **Kata aman:** membantu, menjaga, merawat, menyamarkan tampilan, tampak/terlihat lebih…, terasa.

### F&B/Resto

```
COMPLIANCE F&B (WAJIB): selalu sebut channel order (GoFood/GrabFood/ShopeeFood/dine-in) +
lokasi/jam + harga transparan + status halal kalau ada. Hindari klaim sehat/medis tanpa dasar.
```

### Umum (semua konten)

```
COMPLIANCE UMUM: hindari overclaim, scarcity palsu, testimoni palsu. Sebut harga/varian/cara
beli jelas. SEMUA: hindari SARA, body shaming/colorism, menjelekkan kompetitor. Inklusif &
jujur. Jangan ngarang fakta/angka di luar profil (tandai [PERLU DIISI: ...]).
```

---

## 8. Generators (instruksi per jenis output)

Tiap generator: ganti `{{DAILY_INPUT}}` dengan blok Daily Input. Output = versi enak-dibaca + blok JSON.

### 8.1 Script Reels/TikTok
```
Buatkan SCRIPT video pendek (Reels/TikTok) berdasarkan DAILY INPUT. Terapkan PLAYBOOK
(hook kuat, struktur Hook->Build->Payoff->CTA, panjang pas).
{{DAILY_INPUT}}
Ketentuan: durasi 15-45 detik; 2 OPSI HOOK (pola playbook); tiap scene kasih visual + durasi
+ teks on-screen; 1 CTA sesuai tujuan; bahasa lisan natural.
Keluarkan: (1) versi enak dibaca (2 hook, tabel Scene|Visual|Voiceover|Teks on-screen|Durasi,
CTA, sound, durasi); (2) blok JSON:
{"type":"script","platform":"...","duration_sec":0,"hooks":["",""],"scenes":[{"scene":1,
"visual":"","voiceover":"","onscreen_text":"","duration_sec":0}],"cta":"","sound_suggestion":
"","caption_hint":"","compliance_notes":""}
```

### 8.2 Carousel Instagram
```
Buatkan KONSEP CAROUSEL Instagram berdasarkan DAILY INPUT. Terapkan PLAYBOOK carousel
(slide 1 cover/hook kuat, 1 ide/slide, save-worthy, slide akhir 1 CTA).
{{DAILY_INPUT}}
Ketentuan: 6-8 slide; tiap slide headline + subteks + saran visual; caption (hook 125
karakter pertama) + 3-5 hashtag.
Keluarkan: (1) versi enak dibaca (Judul, Slide 1..n, Caption, Hashtag); (2) blok JSON:
{"type":"carousel","platform":"Instagram","title":"","slides":[{"slide":1,"role":"hook",
"headline":"","subtext":"","visual":""}],"caption":"","hashtags":[],"compliance_notes":""}
```

### 8.3 Storyboard Video
```
Buatkan STORYBOARD/shot list produksi video berdasarkan DAILY INPUT. Realistis dishoot pakai HP.
{{DAILY_INPUT}}
Ketentuan: konsep & durasi (default 20-40s); SHOT urut (visual, angle/gerakan kamera, talent/
props, voiceover, teks on-screen, sfx/musik, durasi); daftar B-ROLL & aset + catatan produksi.
Keluarkan: (1) versi enak dibaca; (2) blok JSON:
{"type":"storyboard","concept":"","duration_sec":0,"shots":[{"shot":1,"visual":"","camera":"",
"talent_props":"","voiceover":"","onscreen_text":"","sfx_music":"","duration_sec":0}],"broll":
[],"production_notes":"","cta":"","compliance_notes":""}
```

### 8.4 Caption + Hashtag
```
Buatkan CAPTION siap posting + hashtag + variasi hook berdasarkan DAILY INPUT. Terapkan
PLAYBOOK caption.
{{DAILY_INPUT}}
Ketentuan: 1 caption utama (hook di 125 karakter pertama, ada CTA brand), 1 caption pendek,
5 variasi hook (1 baris each), 3-5 hashtag (niche+topik+branded+lokal).
Keluarkan: (1) versi enak dibaca; (2) blok JSON:
{"type":"caption","caption_long":"","caption_short":"","hooks":["","","","",""],"hashtags":
[],"compliance_notes":""}
```

### 8.5 Ide Konten (mingguan)
```
Buatkan 7 IDE KONTEN siap-eksekusi (~1 minggu) berdasarkan DAILY INPUT (kalau kosong, dari
profil brand). Sebar ke content pillars (80% value / 20% jualan).
{{DAILY_INPUT}}
Tiap ide: pillar, format (Reels/Carousel/Story), hook (1 baris pola kuat), konsep singkat, CTA.
Keluarkan: (1) tabel (No|Pillar|Format|Hook|Konsep|CTA); (2) blok JSON:
{"type":"ideas","ideas":[{"no":1,"pillar":"","format":"","hook":"","concept":"","cta":""}]}
```

> **Paket Lengkap** = jalankan script + carousel + caption sekaligus (satu klik).

---

## 9. Knowledge Base (ringkas)

- **Hook (12 pola):** curiosity gap · bold/contrarian · "stop ngelakuin X" · pertanyaan · warning/negativity · POV relatable · listicle berangka · before/after · "gue coba X N hari" · relatable struggle · angka kejut · call-out niche.
- **Struktur retensi:** Hook(0-3s) → Build (value tiap 5-8s + pattern-interrupt) → Payoff (angka/hasil) → 1 CTA. Hold 3-detik >60%, completion >70%.
- **Copywriting:** PAS (hook) · AIDA (jualan) · BAB (transformasi) · FAB (fitur) · 4U (judul).
- **Carousel:** 6-8 slide; slide 1 = 80% bobot; 1 ide/slide; save & share 3x like; slide akhir 1 CTA.
- **Caption:** hook 125 char pertama; 150-200 kata; 1 CTA spesifik. **Hashtag:** 3-5 (cap IG 5); niche+topik+branded+lokal.
- **Content pillars (80/20):** Edukasi 30% · Hiburan 20% · BTS/Komunitas 20% · Social proof 15% · Promosi 15%.
- **Pasar Indonesia:** #2 TikTok & TikTok Shop global. IG = estetik/aspiratif; TikTok = raw/menghibur/FYP. Live shopping besar (konversi sampai 3x). Jam belanja puncak 19-22 WIB. COD penting untuk trust.
- **Tone register:** Casual bestie (default Gen Z) · Warm-polite "kak" · Hype/seller (promo) · Edu-credible (topik sensitif).
- **Slang:** racun · checkout/co · gais/bestie · kak/min · POV · GRWM · spill · mantul · gaskeun/kuy/yuk · cuan · healing · glow up · wajib cobain.
- **Skincare angles:** routine/GRWM · edukasi ingredient · mitos vs fakta · "racun"/honest review · before/after compliant.
- **F&B angles:** ASMR/close-up · cheese pull · mukbang · menu reveal · promo/diskon · hidden gem/lokasi · behind-the-kitchen · polling.

---

## 10. Contoh Profil Brand (seed)

### A. GlowUp Skincare (Skincare/Beauty)
- **Hero:** Serum Niacinamide 10%, Sunscreen SPF50, Gentle Cleanser · Harga Rp79k–145k
- **Audience:** cewek 18–28, mahasiswa/fresh grad · **Pain:** kusam, bekas jerawat, takut abal-abal
- **Voice:** Santai+Edukatif, sapaan "kak", emoji secukupnya · **Signature:** "glow bareng GlowUp"
- **Terlarang:** menyembuhkan, memutihkan permanen, 100% hilang · **CTA:** checkout link bio
- BPOM terdaftar · **Ingredient:** Niacinamide, Centella, HA · **Promo:** Glow Bundle 149rb dari 210rb

### B. Mie Gacoan Corner (F&B/Resto)
- **Menu:** Mie Level 1–5, Mie Keju Lava (mulai 15rb), Es Teler, dimsum · Harga Rp10k–35k
- **Audience:** anak muda 16–26, pelajar/mahasiswa · **Pain:** budget tipis, cari nongkrong kekinian
- **Voice:** Lucu/Relatable+Santai, sapaan "gais", emoji banyak · **Signature:** "pedasnya bikin nagih"
- **Terlarang:** menyehatkan, klaim diet · **CTA:** order GoFood/GrabFood/ShopeeFood / dine-in
- Halal; ada seafood (dimsum) · **Lokasi:** Bekasi (baru), Depok, Tangerang · Jam 10–22 · **Promo:** opening Bekasi diskon 20%

---

## 11. Cara Build dari Nol (teknis)

Pilih salah satu pemaketan.

### Opsi A — Satu file HTML (paling sederhana, untuk shared hosting / double-click)

Buat 1 file `index.html` self-contained berisi:

1. **SCHEMA** (object JS) — definisi section + field intake (lihat Bagian 3) + `verticalModules` (skincare/F&B/generic).
2. **Prompt** — konstanta `KNOWLEDGE_PLAYBOOK`, fungsi `complianceFocus(category)`, fungsi `buildSystemPrompt(profile, category)` (gabung Bagian 5–7), object `GENERATORS` (Bagian 8), fungsi `buildBrandProfile(client)` (map field id → label dari schema) & `buildDailyInput(d)`.
3. **LLM call** — panggil Anthropic langsung dari browser:
   ```js
   fetch('https://api.anthropic.com/v1/messages', {
     method: 'POST',
     headers: {
       'content-type': 'application/json',
       'x-api-key': API_KEY,
       'anthropic-version': '2023-06-01',
       'anthropic-dangerous-direct-browser-access': 'true'
     },
     body: JSON.stringify({
       model: 'claude-sonnet-4-6',
       max_tokens: 2000,
       system,
       messages: [{ role: 'user', content: user }]
     })
   })
   // hasil: data.content[].text digabung
   ```
   Kalau tidak ada key → mode demo (kembalikan contoh statis).
4. **Storage** — `localStorage` untuk daftar klien + apiKey + model.
5. **UI** — dashboard kartu klien, form intake (render dari SCHEMA, modul vertikal muncul saat kategori dipilih), panel daily input + tombol generate (script/carousel/storyboard/caption/ideas + Paket Lengkap), hasil multi-blok + tombol Copy teks/JSON.

### Opsi B — Web app Node.js (key di server, data share, untuk VPS)

**Struktur:**
```
app/
  server.js            HTTP server zero-dependency (static + REST /api)
  lib/env.js           loader .env (set process.env sebelum modul lain)
  lib/prompts.js       KNOWLEDGE_PLAYBOOK, complianceFocus, buildSystemPrompt, GENERATORS,
                       buildBrandProfile, buildDailyInput
  lib/llm.js           panggil Anthropic via fetch; fallback mode demo
  lib/store.js         simpan profil klien -> data/clients.json
  web/                 frontend (index.html, app.js, styles.css)
  intake-schema.json   sumber form
  .env                 ANTHROPIC_API_KEY (gitignored)
```

**Endpoint:** `GET /api/health` · `GET /api/schema` · `GET/POST /api/clients` · `GET/DELETE /api/clients/:id` · `POST /api/generate {clientId,dailyInput,outputType}` · `POST /api/generate-package` · `POST /api/seed`.

LLM call sama seperti di atas, **TAPI tanpa** header `anthropic-dangerous-direct-browser-access` (karena dipanggil dari server). API key dari `process.env.ANTHROPIC_API_KEY`.

**Model:** default `claude-sonnet-4-6` (hemat & cepat); `claude-opus-4-8` untuk kualitas tertinggi. `max_tokens` ~2000.

### Automation tiap pagi (opsional)

Script `morning-run.js`: loop semua klien → untuk tiap klien generate paket (script+carousel+caption) → tulis ke `output/<tanggal>/<brand>.md`. Jadwalkan via cron atau GitHub Actions (mis. 07:00 WIB = `0 0 * * *` UTC). **Selalu review manual sebelum posting.**

---

## 12. Deployment

### Shared hosting (Hostinger dll) — versi HTML
1. File Manager → folder docroot (untuk subdomain: folder subdomain spt `public_html/staging`).
2. Upload `content-engine.html`, rename jadi `index.html`.
3. Pastikan SSL aktif (https) — perlu untuk panggilan API dari browser.
4. Buka domain/subdomain → isi API key via tombol ⚙️ → live.

### VPS (Node server) — Ubuntu
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
git clone <repo>; cd app
cp .env.example .env        # isi ANTHROPIC_API_KEY
sudo npm install -g pm2
pm2 start server.js --name content-engine; pm2 save; pm2 startup
```
Lalu Nginx reverse proxy (`proxy_pass http://localhost:3000`) + certbot (HTTPS) + basic auth (karena app belum ada login).

> **Catatan:** versi HTML simpan key & data di browser tiap user (localStorage, tidak sync antar perangkat). Versi server simpan key di server & data share — butuh VPS, dan sebaiknya tambah login sebelum dipakai banyak orang.

---

## 13. Roadmap Lanjutan

- Login/auth + multi-user.
- Storage pindah dari file/localStorage ke database (mis. Supabase/Postgres) untuk multi-device.
- Delivery output otomatis ke Notion / Google Sheets / WhatsApp / email.
- Format output tambahan (ad copy, content calendar, broadcast WA, email).
- Integrasi pembuatan visual (carousel image / video) via tool desain.

---

_Akhir handbook. Semua prompt & template di atas sudah siap dipakai ulang. Bangun, isi profil 1 brand, generate — review — posting._
