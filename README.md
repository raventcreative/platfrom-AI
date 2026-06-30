<div align="center">

# ProdPilot

**Pabrik konten ber-skala untuk banyak brand sekaligus.**

AI menjalankan rantai produksi konten per brand — dari riset sampai aset siap publikasi —
sehingga satu tim bisa melayani puluhan brand secara paralel.

`Multi-brand` · `Chat-first` · `Compliance-first (BPOM/halal/SARA)` · `Human-in-the-loop`

</div>

---

## Daftar isi

- [Visi](#visi)
- [MVP sekarang — Content Engine](#mvp-sekarang--content-engine)
- [Roadmap jangka panjang — 4 pilar](#roadmap-jangka-panjang--4-pilar)
- [Status](#status)
- [Arsitektur (monorepo)](#arsitektur-monorepo)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Dokumen](#dokumen)

---

## Visi

ProdPilot adalah **platform otomasi produksi konten untuk banyak brand sekaligus**. Tujuan
akhirnya adalah loop tertutup **riset → produksi → publish → report** yang berjalan per brand
secara otomatis, dengan manusia sebagai approver.

**Model bisnis:** Hybrid — mulai sebagai agency/done-for-you (validasi + revenue awal), lalu
fitur yang sudah matang diproduktisasi menjadi SaaS self-serve.

**Platform fokus:** Instagram & TikTok.

---

## MVP sekarang — Content Engine

Yang sedang dibangun lebih dulu adalah **Content Engine**: mesin konten harian untuk agency
yang memegang banyak brand klien (skincare, F&B, fashion, jasa, dll). Spec lengkapnya ada di
**[docs/CONTENT_ENGINE_HANDBOOK.md](docs/CONTENT_ENGINE_HANDBOOK.md)**.

**Ide inti:** tim isi profil brand **satu kali per klien**, lalu **tiap pagi tinggal generate**.
AI mengeluarkan konten dengan gaya yang nempel ke tiap brand dan aman secara aturan.

### Alur

```
Intake brand (1x/klien)  →  Daily input (tiap pagi)  →  AI generate  →  Review & approve  →  Posting
```

Tiap generate menggabungkan **System Prompt + Profil Brand + Knowledge Playbook + Compliance**,
lalu mengeluarkan **versi enak-dibaca + blok JSON terstruktur**.

### Output yang dihasilkan (generators)

| Generator | Isi |
|---|---|
| **Script Reels/TikTok** | 2 opsi hook, scene (visual/voiceover/teks on-screen/durasi), CTA, saran sound |
| **Carousel Instagram** | 6–8 slide (headline + subteks + visual), caption, 3–5 hashtag |
| **Storyboard Video** | Shot list siap-shoot pakai HP (kamera, talent/props, B-roll, catatan produksi) |
| **Caption + Hashtag** | Caption panjang & pendek, 5 variasi hook, hashtag |
| **Ide Konten (mingguan)** | 7 ide siap-eksekusi, tersebar ke content pillars (80% value / 20% jualan) |

> **Paket Lengkap** = script + carousel + caption sekaligus dalam satu klik.

### Yang bikin beda

- **Compliance-first** — skincare ikut aturan BPOM (tanpa over-claim/superlatif), F&B jelas
  halal/lokasi/channel order, semua konten hindari SARA & body shaming.
- **Knowledge Playbook** — best-practice hook, struktur retensi, copywriting (PAS/AIDA/BAB/FAB),
  carousel, caption, hashtag, dan konteks pasar Indonesia — disuntik ke prompt tiap generate.
- **Multi-brand** — simpan & kelola banyak profil brand, voice & visual konsisten per brand.
- **Prinsip** — AI = drafter, manusia = approver. Selalu ada review sebelum posting.

---

## Roadmap jangka panjang — 4 pilar

Setelah Content Engine matang, ProdPilot berkembang ke empat pilar penuh (lihat
[PRD](docs/PRD.md) & [Tech Spec](docs/TECH_SPEC_MVP.md)):

1. **Competitor & Market Intelligence** — riset organik + iklan kompetitor (Meta Ads Library) → insight & ide.
2. **Script Engine** — naskah video multi-varian per platform.
3. **Carousel Engine** — copy slide-per-slide + desain carousel konsisten brand (Canva).
4. **AI Video Engine** — video dari script + voice-over + subtitle + assembly (Higgsfield).

Ditutup dengan orkestrasi end-to-end, scheduler/publish, report ke klien, lalu produktisasi SaaS.

---

## Status

🚧 **Sprint 1 (Fondasi) — scaffold selesai.**

| Area | Status |
|---|---|
| Auth (Bearer token = `User.apiToken`) | ✅ |
| Multi-tenant (semua query ter-scope `orgId`) | ✅ |
| Model Org/Brand/User + Brand Voice + Brand Kit (Prisma) | ✅ |
| Chat shell (Conversation/Message → Job) | ✅ |
| Job queue (BullMQ) + worker | ⚠️ stub (job ditandai `SUCCEEDED`, output placeholder) |
| Web UI chat-first + brand switcher | ✅ |
| Generator / agent asli (script/carousel/dst) | ⬜ belum |

> Worker saat ini **belum memanggil LLM**. Implementasi generator (sesuai handbook) menyusul
> di sprint berikutnya. Roadmap build ada di [Tech Spec §11](docs/TECH_SPEC_MVP.md).

---

## Arsitektur (monorepo)

```
apps/
  api/   NestJS + Prisma + BullMQ     REST API + job worker
  web/   Next.js + Tailwind            chat-first UI
docs/    PRD, tech spec, handbook, panduan dev
docker-compose.yml                     Postgres + Redis (dev)
```

---

## Menjalankan secara lokal

Ringkas:

```bash
docker compose up -d        # Postgres :5432, Redis :6379
npm install                 # workspaces (root)

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

npm run db:setup            # prisma generate + migrate + seed
npm run dev:api             # http://localhost:4000/api/v1
npm run dev:web             # http://localhost:3000
```

Seed mencetak **API token** (`dev-token-123`) dan **brand id** contoh. Panduan lengkap +
smoke test + daftar endpoint ada di **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

---

## Dokumen

| Dokumen | Isi |
|---|---|
| 🧭 [Content Engine — Handbook](docs/CONTENT_ENGINE_HANDBOOK.md) | **Spec MVP**: intake, daily input, system prompt, playbook, compliance, generators, build & deploy |
| 📄 [Product Requirements (PRD)](docs/PRD.md) | Visi, model bisnis, 4 pilar, arsitektur agent, roadmap |
| 🛠️ [Technical Spec — MVP Fase 1](docs/TECH_SPEC_MVP.md) | Arsitektur, data model, desain agent, kontrak API, rencana build |
| 🚀 [Development — Sprint 1](docs/DEVELOPMENT.md) | Cara setup & jalankan scaffold lokal |

> Referensi produk sejenis: [Vamos AI](https://getvamos.ai/) — chat-first, brand voice profile, riset terintegrasi, multi-brand.
