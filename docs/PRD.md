# PRD — AI Content Automation Platform untuk Multi-Brand

> **Status:** Draft v2.1
> **Tanggal:** 2026-06-30
> **Pemilik Produk:** raventcreative
> **Nama kerja produk:** **ProdPilot** _(sementara — bisa diganti)_
> **Model bisnis:** Hybrid — mulai sebagai agency/done-for-you, lalu produktisasi menjadi SaaS
> **Spec MVP:** [Content Engine — Handbook](CONTENT_ENGINE_HANDBOOK.md) — yang dibangun lebih dulu (lihat §1.1)

---

## 1. Ringkasan Eksekutif

ProdPilot adalah **platform otomasi produksi konten untuk banyak brand sekaligus**. AI agent menjalankan seluruh rantai kerja — dari **riset kompetitor**, menyusun strategi, menulis **script**, membuat **carousel**, sampai memproduksi **video AI** — sehingga satu tim bisa menjalankan puluhan brand secara paralel.

Empat pilar produk (**visi penuh**):

1. **Competitor & Market Intelligence** — riset organik + iklan kompetitor (Meta Ads Library) jadi insight & ide.
2. **Script Engine** — naskah video (Reels/TikTok) otomatis: hook → body → CTA + shot list.
3. **Carousel Engine** — copy slide-per-slide + desain carousel yang konsisten brand.
4. **AI Video Engine** — video dari script + voice-over + subtitle + assembly.

**Strategi go-to-market (Hybrid):** dipakai dulu secara internal untuk melayani brand klien (done-for-you) — ini sekaligus jadi validasi & sumber revenue awal — lalu fitur yang sudah matang dibuka sebagai **self-serve SaaS** untuk brand langsung.

**Platform fokus v1:** Instagram & TikTok.

### 1.1 Visi vs MVP

PRD ini mendeskripsikan **visi penuh** ProdPilot (4 pilar). Yang **dibangun lebih dulu** adalah MVP-nya: **Content Engine** — mesin konten harian multi-brand untuk agency. Spec lengkap & siap-implementasi: **[Content Engine — Handbook](CONTENT_ENGINE_HANDBOOK.md)**.

**Alur MVP:**

```
Intake brand (1x/klien) → Daily input (tiap pagi) → AI generate → Review & approve → Posting
```

**Lingkup MVP (Content Engine):**
- **Generator:** script Reels/TikTok, carousel IG (copy), storyboard video (shoot pakai HP), caption+hashtag, ide konten mingguan.
- **Knowledge Playbook** (hook, struktur retensi, copywriting, carousel, caption, hashtag, konteks pasar Indonesia) disuntik ke prompt tiap generate.
- **Compliance-first** per vertikal: BPOM (skincare), halal/lokasi/channel order (F&B), anti-SARA/body-shaming (umum).
- **Multi-brand** profil + brand voice; **manusia approver** sebelum posting.

**Di luar MVP (menyusul — lihat §13):** Competitor & Market Intelligence (Meta Ads Library), AI Video Engine penuh (Higgsfield), orkestrasi end-to-end, scheduler & auto-publish, report otomatis, produktisasi SaaS.

---

## 2. Latar Belakang & Masalah

Mengelola konten untuk **banyak brand** itu mahal dan lambat karena:

| Masalah | Dampak |
|---|---|
| Riset kompetitor manual & tidak konsisten | Strategi nebak-nebak, kalah cepat dari tren |
| Tiap brand butuh script, carousel, video terpisah | Produksi tidak terskala, bottleneck di tim kreatif |
| Loncat antar tool (riset → doc → desain → video → publish) | Konteks hilang, kerja ganda, lambat |
| Sulit jaga konsistensi voice & visual per brand | Kualitas tidak seragam, brand "bocor" antar klien |
| Skala produksi terbatas jumlah orang | Tidak bisa tambah banyak brand tanpa tambah headcount |

**Peluang:** AI generatif (teks, gambar, video, suara) + data kompetitor publik (organik + Meta Ads Library) memungkinkan **pabrik konten ber-skala** — yang dibutuhkan: orkestrasi agent + workspace per-brand + human-in-the-loop.

**Diferensiasi (moat):** bukan sekadar generator konten, tapi **loop tertutup riset → produksi → publish → report** yang berjalan per brand secara otomatis.

```
Competitor + Trend Research → Strategy & Calendar → Script / Carousel / Video AI
       → Produksi & Desain → Schedule & Publish → Report
                     ↑__________ feedback performa __________↓
```

---

## 3. Model Bisnis & Positioning

**Hybrid: Agency-first → SaaS.**

| Fase | Mode | Pengguna | Sumber revenue |
|---|---|---|---|
| Awal | Done-for-you (internal tool) | Tim sendiri melayani brand klien | Retainer/proyek per brand |
| Lanjut | Self-serve SaaS | Brand/bisnis langsung | Subscription / pay-per-credit |

**Implikasi desain:**
- Bangun **multi-brand workspace** dan **approval + report ke klien** sejak awal (kebutuhan agency).
- Rancang fitur agar **bisa di-"selfserve-kan"** nanti (onboarding mandiri, billing, kuota kredit) — siapkan fondasinya, aktifkan belakangan.
- Hindari fitur yang hanya relevan untuk salah satu mode dan sulit dilepas.

---

## 4. Tujuan & Metrik Keberhasilan

### 4.1 Tujuan Produk
1. Satu tim bisa menjalankan **banyak brand** dengan output konsisten & terskala.
2. Dari **riset kompetitor → ide & strategi** otomatis, bukan manual.
3. Produksi **script, carousel, video AI** dari satu alur, per brand.
4. Jaga konsistensi voice & visual per brand (brand kit).

### 4.2 KPI

| Metrik | Target v1 |
|---|---|
| Brand yang bisa dikelola per 1 operator | ≥ 10 |
| Waktu riset kompetitor 1 brand (otomatis) | < 10 menit |
| Waktu prompt → draft script | < 2 menit |
| Waktu prompt → carousel (copy+desain) | < 5 menit |
| Waktu script → video draft | < 15 menit |
| % deliverable diterima tanpa revisi besar | ≥ 60% |
| Penghematan waktu vs alur manual | ≥ 70% |

### 4.3 Non-Goals (v1)
- Bukan video editor timeline manual frame-by-frame.
- Bukan platform manajemen iklan penuh (insight & creative ada; optimisasi ads mendalam menyusul).
- Bukan menggantikan tim kreatif — assistive + human-in-the-loop.

---

## 5. Persona

| Persona | Peran | Kebutuhan utama |
|---|---|---|
| **Content Strategist / Account Lead** (agency) | Pegang banyak brand klien | Riset cepat, strategi, jaga kualitas, report ke klien |
| **Copywriter / Scriptwriter** | Tulis naskah & carousel | Draft awal otomatis dari riset, multi-varian |
| **Designer / Editor** | Visual & video | Desain carousel & video AI brand-consistent, tinggal poles |
| **Brand Owner / Marketer** (SaaS, fase lanjut) | Kelola brand sendiri | Pipeline lengkap mandiri, murah, cepat |

**Persona utama v1:** Content Strategist/Account Lead di agency (mode done-for-you).

---

## 6. Empat Pilar Produk

> **Catatan lingkup MVP:** Di Content Engine, yang aktif lebih dulu adalah **produksi konten** — Pilar 2 (Script) & Pilar 3 (Carousel, bagian copy) plus generator storyboard/caption/ide — dengan knowledge playbook + compliance. **Pilar 1 (Competitor Intelligence)** dan **Pilar 4 (AI Video penuh)** menyusul pasca-MVP; di MVP, video cukup berupa **storyboard siap-shoot pakai HP**. Detail per-generator: [Content Engine Handbook §8](CONTENT_ENGINE_HANDBOOK.md).

### Pilar 1 — Competitor & Market Intelligence

**Input:** akun/brand kompetitor, niche, kata kunci.

**Yang diotomasi:**
- **Riset organik (IG/TikTok\*)** — konten top-performing kompetitor: hook, format (reels/carousel), frekuensi & jam posting, pola engagement, tema berulang.
- **Riset iklan (Meta Ads Library)** — iklan **aktif** kompetitor: angle, creative, copy, sudah berapa lama berjalan (proksi "iklan yang menang").
- **Trend & gap analysis** — tren format/topik per niche + celah konten yang belum digarap kompetitor.
- **Swipe file & hook bank** — kumpulan hook/angle terbaik untuk dipakai ulang.
- **Output:** laporan insight + daftar ide konten + rekomendasi angle, langsung bisa masuk ke Script/Carousel Engine.

**Tools:** Instagram (Composio), **Meta Ads Library** (`ads_library_search`), Higgsfield virality predictor, insights/benchmark Meta.

> \***Catatan integrasi TikTok:** belum ada integrasi resmi TikTok di environment ini. Untuk riset & publishing TikTok diperlukan integrasi tambahan / penyedia data pihak ketiga (lihat §11).

---

### Pilar 2 — Script Engine

**Input:** brief/produk/angle (bisa otomatis dari hasil riset).

**Yang diotomasi:**
- Naskah video **per platform** (gaya Reels ≠ gaya TikTok), struktur **Hook → Body → CTA** + timestamp.
- **Shot list** per scene (visual, narasi, durasi).
- **Multi-varian & multi-tone** sekaligus (mis. 3 hook berbeda).
- Tarik hook dari **hook bank** hasil riset kompetitor.
- Editor inline + versi + komentar + approval.

**Tools:** LLM (model Claude terbaru).

---

### Pilar 3 — Carousel Engine

**Input:** topik/angle/produk.

**Yang diotomasi:**
- **Copy slide-per-slide**: slide cover (hook), slide isi (value/edukasi), slide CTA.
- **Desain carousel** brand-consistent (warna, font, logo) — auto-layout per slide.
- Multi-varian + rasio (4:5 / 1:1).
- Export siap unggah.

**Tools:** **Canva** (generate-design, brand templates, export), Higgsfield (gambar pendukung).

---

### Pilar 4 — AI Video Engine

**Input:** script yang sudah di-approve.

**Yang diotomasi:**
- **Storyboard / scene breakdown** dari script.
- **Generate video per scene** (text→video / image→video).
- **Voice-over** multi-suara & multi-bahasa; **dubbing** untuk varian bahasa.
- **Subtitle**, musik, transisi, **assembly** jadi video utuh.
- **Reframe** 9:16 (Reels/TikTok) & **upscale** kualitas.

**Tools:** **Higgsfield** (generate_video, generate_image, generate_audio/voice, dubbing, reframe, upscale, virality_predictor).

---

## 7. Fitur Lintas-Pilar (cross-cutting)

### 7.1 Multi-Brand Workspace
- **Workspace terpisah per brand**: brand kit (logo, warna, font, tone, do/don't), aset, template, kompetitor yang dipantau.
- **Asset library** reusable per brand.
- Isolasi data antar brand/klien (penting untuk agency & SaaS).

### 7.2 Orkestrasi & Human-in-the-Loop
- **Workflow engine**: Riset → Strategi → Script/Carousel/Video → Publish → Report.
- **Approval gate** tiap tahap (auto/manual).
- Status real-time, retry per tahap, riwayat & audit.

### 7.3 Distribusi & Publishing
- **Schedule + posting Instagram** (tool tersedia).
- **TikTok**: butuh integrasi tambahan (lihat §11) — sementara bisa export + posting manual.
- Alur draft → approval → publish.

### 7.4 Analytics & Reporting
- Tracking performa per brand/post.
- **Auto-report** ke klien → **Notion / Gamma deck / Google Drive**.
- Competitor benchmark report.

### 7.5 Kolaborasi & Ops (mode agency)
- Project/folder per klien, komentar & approval multi-user.
- Pitch deck → **Gamma**; notulen meeting → **Notion** (dari **Zoom**); jadwal → **Google Calendar**; komunikasi → **Gmail**.

### 7.6 Compliance & Brand Safety _(aktif sejak MVP)_
- **Aturan per vertikal** disuntik ke tiap generate: skincare ikut **BPOM** (tanpa klaim menyembuhkan/memutihkan/superlatif; hasil dibingkai "tampak/membantu"); **F&B** sebut halal/lokasi/jam/channel order/harga; **umum** hindari SARA, body shaming, testimoni & scarcity palsu.
- **Knowledge Playbook** terpusat (best-practice + konteks pasar Indonesia) → sumber kualitas yang konsisten antar brand.
- **Self-check** otomatis sebelum output final: hook kuat di 3 detik, tepat 1 CTA, klaim aman, sesuai voice & kata terlarang brand, tidak mengarang angka.
- Detail: [Content Engine Handbook §6–§7](CONTENT_ENGINE_HANDBOOK.md).

---

## 8. User Stories (ringkas, per pilar)

**Riset**
- Sebagai strategist, saya masukkan 3 akun kompetitor → dapat laporan hook & iklan aktif mereka + 20 ide konten, agar strategi berbasis data.

**Script**
- Sebagai copywriter, saya minta 3 varian script Reels 30 detik dari satu angle → tinggal pilih & poles.

**Carousel**
- Sebagai designer, saya minta carousel 7 slide tentang topik X → dapat copy + desain brand-consistent siap unggah.

**Video AI**
- Sebagai editor, saya approve script → agent hasilkan video 9:16 + voice-over Indonesia otomatis.

**Multi-brand**
- Sebagai account lead, saya jalankan alur yang sama untuk 10 brand dengan brand kit masing-masing, paralel.

**Report**
- Sebagai account lead, saya generate report bulanan per brand → kirim ke klien lewat Notion/Gamma.

---

## 9. Arsitektur Agent (Konseptual)

```
                       ┌───────────────────────────────┐
                       │         ORCHESTRATOR           │
                       │   workflow + state + approval  │
                       └───────────────┬───────────────┘
                                       │
   ┌──────────┬──────────┬─────────────┼────────────┬──────────┬──────────┐
   ▼          ▼          ▼             ▼            ▼          ▼          ▼
┌────────┐┌────────┐┌──────────┐ ┌──────────┐┌──────────┐┌────────┐┌────────┐
│Research││Strategy││  Script  │ │ Carousel ││  Video   ││Publish ││ Report │
│ Agent  ││ Agent  ││  Agent   │ │  Agent   ││  Agent   ││ Agent  ││ Agent  │
└────────┘└────────┘└──────────┘ └──────────┘└──────────┘└────────┘└────────┘
   │          │          │             │            │          │          │
   └──────────┴──────────┴─────────────┴────────────┴──────────┴──────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │             TOOL LAYER                │
                    │  IG/Composio + Meta Ads Library (riset)│
                    │  LLM (script/strategy/copy)            │
                    │  Canva (carousel/desain)               │
                    │  Higgsfield (video/voice/gambar)       │
                    │  Notion/Gamma/Drive (report/arsip)     │
                    │  IG (publish) · TikTok (perlu integrasi)│
                    └───────────────────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │   BRAND CONTEXT (per workspace)       │
                    │   brand kit · voice · kompetitor · aset│
                    └───────────────────────────────────────┘
```

**Prinsip:** tiap agent satu peran; orchestrator stateful (pause di approval, resume, retry); semua agent membaca **Brand Context** agar output konsisten per brand; tool-agnostic (provider bisa diganti).

---

## 10. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| Performa | Riset < 10 mnt; script < 2 mnt; carousel < 5 mnt; video < 15 mnt |
| Skala | Job async/antrian; banyak brand & job paralel |
| Multi-tenant | Isolasi data per brand/klien (wajib untuk agency & SaaS) |
| Keandalan | Retry per tahap; progress tidak hilang |
| Biaya | Pantau kredit (video/LLM mahal) + estimasi biaya per job/brand |
| Kepatuhan | Pelabelan konten AI; patuhi kebijakan IG/TikTok/Meta; data kompetitor hanya yang publik |
| Auditability | Riwayat versi & approval per brand |
| Multi-bahasa | Script & voice-over minimal ID + EN |

---

## 11. Integrasi Tool & Celah

**Sudah tersedia (MCP terhubung di environment):**

| Tool | Peran |
|---|---|
| Instagram (Composio) | Riset organik + publishing IG |
| **Meta Ads Library** | Riset iklan aktif kompetitor |
| Facebook/Meta Ads | Setup & insight iklan |
| Higgsfield | Video, gambar, voice-over, dubbing, reframe, upscale, virality predictor |
| Canva | Desain carousel, thumbnail, brand template |
| Gamma | Deck/report/pitch |
| Notion / Google Drive | Arsip & report |
| Zoom / Gmail / Calendar | Ops internal |

**Celah yang perlu diputuskan/diadakan:**
- ⚠️ **TikTok** — belum ada integrasi resmi. Butuh: (a) penyedia data pihak ketiga untuk riset TikTok, dan (b) TikTok Content Posting API / tool pihak ketiga untuk publishing. Sementara: export manual.
- ⚠️ **Penjadwalan/scheduler** lintas platform — perlu komponen scheduler sendiri.
- ⚠️ **Manajemen kredit/billing** (untuk fase SaaS).

---

## 12. Rekomendasi Tech Stack (usulan)

| Lapisan | Usulan |
|---|---|
| Frontend | Next.js + React + Tailwind |
| Backend/API | Node.js (NestJS) atau Python (FastAPI) |
| Orkestrasi agent | Agent + MCP tools; workflow engine + job queue |
| Async | Redis + worker queue (BullMQ/Celery) |
| Database | PostgreSQL + object storage (S3) untuk aset |
| LLM | Model Claude terbaru (script/strategi/riset) |
| Video/Voice/Gambar | Higgsfield (MCP) |
| Desain | Canva (MCP) |
| Multi-tenant/Auth | OAuth + isolasi per workspace |

---

## 13. Roadmap (Hybrid: Agency-first → SaaS)

### Fase 0 — Validasi (1–2 mgg)
Finalisasi PRD, mockup alur, uji dengan 1–2 brand klien nyata.

### Fase 1 — MVP: Content Engine (Done-for-you) (4–6 mgg)
Mesin konten harian multi-brand, dipakai tim sendiri (spec: [Handbook](CONTENT_ENGINE_HANDBOOK.md)):
- **Intake brand** (profil 1x/klien) + **daily input** + multi-brand profil & brand voice.
- **Generator:** script, carousel (copy), storyboard, caption+hashtag, ide mingguan.
- **Knowledge Playbook** + **compliance per vertikal** disuntik ke tiap generate.
- Output **teks enak-dibaca + JSON terstruktur**, review & approve, copy/export.
> Build order: prompt + playbook + compliance → 1–2 generator → multi-brand → sisanya. Video di fase ini = **storyboard** (belum render).

### Fase 2 — Pilar Berat & Desain (4–5 mgg)
Tambah pilar yang butuh integrasi tool:
- **Research Agent** (organik IG + Meta Ads Library) → insight & ide otomatis nge-feed ke generator.
- **Carousel desain** (Canva, brand-consistent) + export gambar.
- **AI Video Engine** (script→video + voice-over + subtitle + assembly, Higgsfield).

### Fase 3 — Orkestrasi & Distribusi (4–5 mgg)
Workflow end-to-end, approval gate, status real-time, publish IG, scheduler, report ke klien (Notion/Gamma).

### Fase 4 — Skala Multi-Brand (4 mgg)
Banyak brand paralel, template per brand, asset library, kolaborasi multi-user, integrasi TikTok (riset + publish via pihak ketiga).

### Fase 5 — Produktisasi SaaS (6–8 mgg)
Onboarding mandiri, billing & kuota kredit, self-serve workspace, paywall fitur, analytics pengguna.

### Fase 6 — Penyempurnaan
Optimisasi biaya, A/B test creative & ads, rekomendasi berbasis performa.

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Biaya video/LLM tinggi | Margin tipis | Estimasi biaya per job/brand, draft resolusi rendah dulu, kuota kredit |
| Integrasi TikTok belum ada | Fitur tak lengkap | Mulai dari IG; adakan pihak ketiga untuk TikTok; export manual sementara |
| Kebijakan platform (scraping/posting) | Akun diblokir | Pakai API resmi & data publik; pelabelan AI; hormati ToS |
| Kualitas video AI belum konsisten | Hasil ditolak | Human-in-the-loop, regenerate per scene |
| Kompleksitas multi-brand | Sulit maintain | Mulai linear, agent modular, Brand Context terpusat |
| Loncat ke SaaS terlalu cepat | Produk belum matang | Validasi via agency dulu, produktisasi yang sudah terbukti |

---

## 15. Pertanyaan Terbuka (sisa keputusan)

1. **TikTok**: setuju pakai penyedia data/posting pihak ketiga, atau cukup export manual dulu di v1?
2. **Niche/industri awal**: fokus brand di vertikal tertentu dulu (mis. kecantikan/F&B) agar template & riset lebih tajam?
3. **Bahasa**: Indonesia saja dulu, atau ID + EN sejak awal?
4. **Branding**: nama final platform (sementara: ProdPilot)?
5. **Skala awal**: target berapa brand di 3 bulan pertama (memengaruhi prioritas otomasi vs manual)?

---

## 16. Lampiran — Contoh End-to-End (produk kecantikan, IG + TikTok)

**Brand:** serum Vitamin C, target wanita 25–35.

1. **Riset** — scan 3 kompetitor: hook "kulit kusam" paling sering dipakai; 4 iklan aktif di Meta Ads Library beraangle "glowing 7 hari"; gap: belum ada yang bahas "aman untuk kulit sensitif".
2. **Strategi** — angle terpilih: "glowing tanpa iritasi" + content pillar mingguan.
3. **Script** — 3 varian Reels/TikTok 30 detik (Hook → Body → CTA) + shot list.
4. **Carousel** — 7 slide "5 tanda kulit butuh Vitamin C" + desain brand (Canva).
5. **Video AI** — storyboard → generate per scene (Higgsfield) → voice-over ID → subtitle → assembly 9:16.
6. **Publish & Report** — jadwalkan ke Instagram; export untuk TikTok; arsip + report ke klien (Notion/Gamma).

---

_Draft untuk diskusi. Mohon review §15 (Pertanyaan Terbuka) untuk finalisasi._
