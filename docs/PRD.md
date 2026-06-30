# PRD — AI Agent Production Automation Platform

> **Status:** Draft v1.0
> **Tanggal:** 2026-06-30
> **Pemilik Produk:** raventcreative
> **Nama kerja produk:** **ProdPilot** _(sementara — bisa diganti)_

---

## 1. Ringkasan Eksekutif

ProdPilot adalah platform di mana **AI agent menjalankan otomasi end-to-end** untuk tim produksi konten/kreatif. Pengguna cukup memberi **satu prompt tingkat tinggi** (mis. _"buatkan kampanye untuk produk kecantikan X"_), lalu serangkaian AI agent mengubahnya menjadi **deliverable siap-produksi**: konsep, **naskah (skrip)**, storyboard, **video dari skrip tersebut**, voice-over, hingga aset siap publikasi.

Tujuannya: memangkas waktu dari _ide → aset produksi_ dari hitungan hari menjadi hitungan menit, sambil tetap memberi tim produksi kontrol penuh (review, edit, approve) di setiap tahap.

**Contoh alur inti (happy path):**

```
Prompt: "Buatkan produk kecantikan — serum vitamin C untuk usia 25-35.
          Buatkan skrip iklan 30 detik dan video dari skrip itu."
   │
   ▼
[Agent Brief]    → menyusun brief produk, target audiens, tone, angle
   │
   ▼
[Agent Skrip]    → menghasilkan skrip (hook, body, CTA) + shot list
   │
   ▼  (review tim produksi — approve / revisi)
   │
   ▼
[Agent Storyboard] → storyboard / scene breakdown per shot
   │
   ▼
[Agent Video]    → generate video per scene (Higgsfield) + voice-over
   │
   ▼
[Agent Assembly] → gabung scene, subtitle, musik, export
   │
   ▼
Output: skrip final + video jadi + aset, dikirim ke tim produksi / publishing
```

---

## 2. Latar Belakang & Masalah

Tim produksi konten (agency, brand, UMKM, content house) saat ini menghadapi:

| Masalah | Dampak |
|---|---|
| Pembuatan skrip & konsep manual, berulang | Lambat, mahal, bottleneck di copywriter |
| Loncat-loncat antar tool (doc → desain → video → publish) | Konteks hilang, kerja ganda, error |
| Sulit menjaga konsistensi brand di banyak aset | Kualitas tidak seragam |
| Iterasi konten butuh waktu lama | Kalah cepat dengan tren pasar |
| Skala produksi terbatas oleh jumlah orang | Tidak bisa produksi banyak varian sekaligus |

**Peluang:** AI generatif (teks, gambar, video, suara) sekarang cukup matang untuk merangkai pipeline produksi otomatis — yang dibutuhkan adalah **orkestrasi** (agent yang tahu urutan kerja) + **human-in-the-loop** (kontrol tim) + **integrasi tool nyata**.

---

## 3. Tujuan & Metrik Keberhasilan

### 3.1 Tujuan Produk
1. Mengubah satu prompt menjadi paket deliverable produksi (skrip + video) secara otomatis.
2. Memberi tim produksi kontrol review/approve di tiap tahap (bukan black box).
3. Menjaga konsistensi brand (tone, visual, logo, warna) lintas aset.
4. Memungkinkan produksi banyak varian konten secara paralel.

### 3.2 Metrik Keberhasilan (KPI)

| Metrik | Target v1 |
|---|---|
| Waktu prompt → draft skrip | < 2 menit |
| Waktu prompt → video draft jadi | < 15 menit |
| % deliverable diterima tanpa revisi besar | ≥ 60% |
| Jumlah varian konten per 1 prompt | ≥ 3 |
| Retensi pengguna (W4) | ≥ 30% |
| Penghematan waktu vs alur manual | ≥ 70% |

### 3.3 Non-Goals (di luar cakupan awal)
- Bukan video editor profesional manual (kita generate + assembly, bukan timeline editor frame-by-frame).
- Bukan tool manajemen iklan penuh (integrasi publishing ada, tapi optimisasi ads bukan fokus v1).
- Tidak menggantikan tim produksi — memperkuatnya (assistive, bukan autonomous penuh tanpa approval).

---

## 4. Target Pengguna & Persona

| Persona | Peran | Kebutuhan utama |
|---|---|---|
| **Content Producer / Creative Lead** | Memimpin produksi konten | Cepat menghasilkan skrip & video dari brief, jaga kualitas |
| **Copywriter / Scriptwriter** | Menulis naskah | Draft awal otomatis untuk dikembangkan, bukan dari nol |
| **Social Media / Brand Manager** | Kelola channel & kampanye | Banyak varian konten konsisten brand, siap publish |
| **UMKM / Solo Creator** | Produksi sendiri tanpa tim besar | Pipeline lengkap dalam satu tempat, murah, cepat |
| **Agency Operator** | Layani banyak klien | Skala produksi, template per klien/brand |

**Persona utama v1:** Content Producer & Social Media Manager di brand/agency skala kecil-menengah.

---

## 5. User Stories

**Epik A — Dari prompt ke skrip**
- Sebagai produser, saya ingin mengetik prompt produk dan mendapat **skrip terstruktur** (hook/body/CTA + shot list) agar bisa langsung dipakai/diedit.
- Sebagai copywriter, saya ingin meminta **beberapa varian skrip** (tone berbeda) agar bisa pilih yang terbaik.

**Epik B — Dari skrip ke video**
- Sebagai produser, saya ingin agent **mengubah skrip yang sudah disetujui menjadi video** per scene secara otomatis.
- Sebagai produser, saya ingin **voice-over otomatis** sesuai skrip dengan pilihan suara.

**Epik C — Kontrol & review (human-in-the-loop)**
- Sebagai produser, saya ingin **menyetujui/merevisi** tiap tahap sebelum lanjut, agar hasil sesuai harapan.
- Sebagai brand manager, saya ingin agent **mematuhi brand kit** (warna, font, logo, tone) otomatis.

**Epik D — Output & distribusi**
- Sebagai produser, saya ingin **mengekspor** skrip & video, atau mengirimnya ke Notion/Drive.
- Sebagai social media manager, saya ingin **draft posting** ke Instagram/Facebook dari aset jadi.

**Epik E — Skala & template**
- Sebagai agency, saya ingin **menyimpan template alur & brand** per klien agar produksi konsisten.
- Sebagai produser, saya ingin **menjalankan 1 prompt jadi banyak varian** (mis. 5 hook berbeda) sekaligus.

---

## 6. Lingkup Fungsional (Functional Requirements)

### 6.1 Modul Prompt & Brief
- Input prompt natural language + form opsional (produk, audiens, durasi, platform, tone).
- Agent menyusun **brief terstruktur** yang bisa diedit sebelum lanjut.
- Mendukung upload referensi (gambar produk, brand kit, contoh konten).

### 6.2 Modul Skrip (Scriptwriting Agent)
- Output skrip terstruktur: **Hook → Body → CTA**, dengan durasi/timestamp.
- **Shot list** otomatis (per scene: visual, narasi, durasi).
- Multi-varian skrip (N varian dengan tone berbeda).
- Editor inline + komentar + versi (history).

### 6.3 Modul Storyboard / Scene Breakdown
- Pecah skrip menjadi scene dengan deskripsi visual tiap shot.
- Generate gambar referensi/storyboard per scene (opsional).

### 6.4 Modul Video (Video Generation Agent)
- Generate video per scene dari deskripsi shot (teks → video / gambar → video).
- **Voice-over** dari skrip (text-to-speech, pilihan suara/bahasa).
- Tambah subtitle, musik latar, transisi.
- **Assembly**: gabung scene → video utuh → export (rasio 9:16, 1:1, 16:9).

### 6.5 Modul Brand & Konsistensi
- Brand kit: logo, palet warna, font, tone of voice, do/don't.
- Agent mematuhi brand kit di skrip & visual.

### 6.6 Modul Orkestrasi Agent (inti platform)
- **Workflow engine**: definisi tahap (brief → skrip → storyboard → video → assembly).
- Tiap tahap punya **gate approval** (auto / manual).
- **Status & progress** real-time tiap job.
- Re-run / revisi parsial (ulang 1 tahap tanpa mengulang semua).
- Riwayat & audit (siapa approve apa, versi mana).

### 6.7 Modul Output & Integrasi
- Export: skrip (PDF/Docs), video (MP4), aset (zip).
- Integrasi: simpan ke Notion/Drive, draft posting ke Instagram/Facebook.
- Kirim notifikasi ke tim (email/notifikasi) saat deliverable siap.

### 6.8 Modul Kolaborasi & Manajemen
- Project & folder per klien/kampanye.
- Komentar & approval multi-user.
- Library aset yang reusable.
- Template alur produksi.

---

## 7. Arsitektur Agent (Konseptual)

```
                      ┌──────────────────────────────┐
                      │        ORCHESTRATOR           │
                      │  (workflow engine + state)    │
                      │  - urutan tahap               │
                      │  - approval gates             │
                      │  - retry / branching          │
                      └──────────────┬───────────────┘
                                     │
        ┌─────────────┬──────────────┼──────────────┬─────────────┐
        ▼             ▼              ▼              ▼             ▼
  ┌──────────┐ ┌──────────┐  ┌────────────┐ ┌──────────┐ ┌──────────┐
  │  Brief   │ │  Skrip   │  │ Storyboard │ │  Video   │ │ Assembly │
  │  Agent   │ │  Agent   │  │   Agent    │ │  Agent   │ │  Agent   │
  └──────────┘ └──────────┘  └────────────┘ └──────────┘ └──────────┘
        │             │              │              │             │
        └─────────────┴──────────────┴──────────────┴─────────────┘
                                     │
                        ┌────────────▼────────────┐
                        │      TOOL LAYER          │
                        │  LLM (skrip/brief)       │
                        │  Higgsfield (video/voice)│
                        │  Canva/Gamma (desain)    │
                        │  Notion/Drive (simpan)   │
                        │  Instagram/FB (publish)  │
                        └─────────────────────────┘
```

**Prinsip desain:**
- **Setiap agent = satu peran jelas** (single responsibility), mudah ditambah/ganti.
- **Orchestrator stateful** → bisa pause di approval gate, resume, retry per tahap.
- **Human-in-the-loop** sebagai default, bukan pengecualian.
- **Tool-agnostic** → backend video/LLM bisa diganti tanpa ubah alur.

---

## 8. Integrasi Tool (sudah tersedia di environment)

Environment ini sudah terhubung ke MCP server berikut — kandidat integrasi langsung:

| Tool | Fungsi di pipeline |
|---|---|
| **Higgsfield** | Generate video, gambar, voice-over/dubbing, upscale, virality predictor |
| **Canva** | Desain grafis, thumbnail, brand template, export |
| **Gamma** | Deck/presentasi/halaman dari konten |
| **Instagram / Facebook Meta Ads** | Publishing & kampanye iklan |
| **Notion** | Simpan brief, skrip, dokumentasi project |
| **Google Drive / Gmail / Calendar** | Penyimpanan aset, notifikasi, jadwal produksi |
| **Miro** | Storyboard/whiteboard kolaboratif |
| **Zoom** | Sumber rekaman/aset meeting (opsional) |

> Catatan: ketersediaan tiap tool bergantung pada otorisasi akun pengguna. Sebagian butuh login/OAuth.

---

## 9. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Performa** | Draft skrip < 2 mnt; video draft < 15 mnt; UI responsif |
| **Skalabilitas** | Job async/antrian; banyak job paralel per user |
| **Keandalan** | Retry otomatis tahap gagal; tidak kehilangan progress |
| **Keamanan** | Enkripsi data, isolasi data antar klien/tenant, kelola kredensial tool aman |
| **Hak cipta & kepatuhan** | Jejak sumber aset; pelabelan konten AI; filter konten sesuai kebijakan platform |
| **Biaya** | Pantau pemakaian kredit (video/LLM mahal) + estimasi biaya per job |
| **Auditability** | Riwayat versi & approval lengkap |
| **Multi-bahasa** | Skrip & voice-over minimal ID + EN |

---

## 10. Rekomendasi Tech Stack (usulan, bisa disesuaikan)

| Lapisan | Usulan |
|---|---|
| Frontend | Next.js + React + Tailwind |
| Backend/API | Node.js (NestJS) atau Python (FastAPI) |
| Orkestrasi agent | LLM orchestration (mis. arsitektur agent + MCP tools), workflow engine + job queue |
| Antrian/async | Redis + worker queue (BullMQ/Celery) |
| Database | PostgreSQL (data) + object storage/S3 (aset video) |
| LLM | Model Claude terbaru untuk skrip/brief/orkestrasi |
| Video/Voice | Higgsfield (via MCP) |
| Auth | OAuth + multi-tenant |

> Stack final akan ditetapkan saat fase desain teknis (lihat Roadmap).

---

## 11. Roadmap & Milestone

### Fase 0 — Validasi (1–2 minggu)
- Finalisasi PRD, mockup alur, validasi dengan 2–3 calon pengguna.

### Fase 1 — MVP "Prompt → Skrip" (3–4 minggu)
- Input prompt + brief agent + skrip agent (multi-varian) + editor + export.
- **Deliverable:** dari prompt jadi skrip siap pakai.

### Fase 2 — "Skrip → Video" (4–6 minggu)
- Storyboard agent + video agent (Higgsfield) + voice-over + assembly + export MP4.
- **Deliverable:** dari skrip jadi video draft otomatis (= contoh kasus produk kecantikan).

### Fase 3 — Orkestrasi & Kontrol (3–4 minggu)
- Approval gates, status real-time, retry per tahap, brand kit, project/folder.

### Fase 4 — Skala & Distribusi (4 minggu)
- Multi-varian paralel, template per klien, integrasi publishing (IG/FB), kolaborasi multi-user.

### Fase 5 — Penyempurnaan
- Analytics, virality predictor, optimisasi biaya, multi-tenant penuh.

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Biaya generate video/LLM tinggi | Margin tipis | Estimasi biaya per job, tier kredit, cache, draft resolusi rendah dulu |
| Kualitas video AI belum konsisten | Hasil ditolak | Human-in-the-loop, regenerate per scene, kurasi model |
| Ketergantungan pada tool pihak ke-3 | Vendor lock / downtime | Arsitektur tool-agnostic, fallback provider |
| Isu hak cipta / kebijakan platform | Aset ditolak/diblokir | Pelabelan AI, filter konten, jejak sumber |
| Kompleksitas orkestrasi | Sulit di-maintain | Mulai linear sederhana, agent modular, tambah branching bertahap |
| Ekspektasi "full otomatis tanpa orang" | Kecewa | Posisikan sebagai assistive + kontrol manusia |

---

## 13. Pertanyaan Terbuka (perlu keputusan)

1. **Target pengguna utama v1**: agency, brand in-house, atau UMKM/solo creator? (memengaruhi prioritas fitur)
2. **Jenis konten prioritas**: iklan pendek (TikTok/Reels), video panjang (YouTube), atau gambar/desain?
3. **Tingkat otomasi**: seberapa banyak approval manual yang diinginkan di v1?
4. **Model bisnis**: subscription, pay-per-credit, atau per-seat?
5. **Bahasa prioritas**: Indonesia saja dulu, atau multi-bahasa sejak awal?
6. **Output utama**: cukup skrip + video, atau langsung sampai publish ke sosmed?
7. **Branding produk**: nama final platform (sementara: ProdPilot)?

---

## 14. Lampiran — Contoh End-to-End (kasus produk kecantikan)

**Input prompt:**
> "Buatkan produk kecantikan: serum Vitamin C untuk wanita 25–35 yang peduli kulit kusam. Buatkan skrip iklan 30 detik untuk Instagram Reels, lalu buatkan videonya dari skrip itu. Tone: fresh, premium, meyakinkan."

**Output yang dihasilkan platform:**
1. **Brief** — produk, audiens, USP, tone, platform, durasi.
2. **Skrip 30 detik** (3 varian):
   - Hook (0–3s): _"Kulit kusam bikin nggak pede?"_
   - Body (3–22s): manfaat serum, before/after, kandungan.
   - CTA (22–30s): _"Coba sekarang, glowing dalam 7 hari."_
   - + **shot list** per scene.
3. **Storyboard** — 5–6 scene dengan deskripsi visual.
4. **Video** — tiap scene di-generate (Higgsfield) + voice-over ID + subtitle + musik.
5. **Assembly** — video 9:16 final, durasi 30s, siap review.
6. **Distribusi** — draft caption + posting ke Instagram (opsional), arsip ke Notion/Drive.

---

_Dokumen ini adalah draft awal untuk diskusi. Mohon review bagian §13 (Pertanyaan Terbuka) agar bisa difinalisasi._
