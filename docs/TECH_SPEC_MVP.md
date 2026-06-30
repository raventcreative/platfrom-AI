# Technical Spec — MVP Fase 1

> **Status:** Draft v1.0
> **Tanggal:** 2026-06-30
> **Mengacu pada:** [PRD.md](PRD.md) §6 (Empat Pilar), §13 (Roadmap Fase 1)
> **Referensi produk sejenis:** Vamos AI (getvamos.ai) — chat-first, brand voice profile, riset terintegrasi, model routing, multi-brand (agency plan)

Dokumen ini mendefinisikan **arsitektur, data model, desain agent, kontrak API, integrasi tool, dan model routing** untuk MVP internal (mode done-for-you). Tujuan: tim bisa menjalankan 4 pilar untuk banyak brand.

---

## 1. Lingkup MVP Fase 1

**Masuk:**
- Multi-brand workspace + **Brand Voice Profile** (ekstrak dari contoh konten / link sosial).
- **Pilar 1 — Research Agent**: organik IG + **Meta Ads Library**.
- **Pilar 2 — Script Engine**: multi-varian, per platform (Reels/TikTok).
- **Pilar 3 — Carousel Engine**: copy + desain (Canva).
- **Pilar 4 — Video Engine**: script → video + voice-over (Higgsfield).
- **Antarmuka chat-first** per brand + approval manual + export.
- **Model routing** (Claude untuk tulis, model murah untuk riset/klasifikasi).

**Ditunda (fase berikut):**
- Auto-publish/scheduler, integrasi TikTok resmi, billing/kuota SaaS, analytics performa, kolaborasi multi-user lanjutan.

---

## 2. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                          │
│   Brand switcher · Chat UI · Project board · Asset library · Review│
└───────────────────────────────┬──────────────────────────────────┘
                                 │ REST / SSE (streaming)
┌───────────────────────────────▼──────────────────────────────────┐
│                       API GATEWAY (NestJS)                         │
│   Auth · Brand context resolver · Rate limit · Cost guard          │
└───────┬─────────────────────────────────────────┬─────────────────┘
        │                                          │
┌───────▼─────────┐                      ┌─────────▼─────────────────┐
│  ORCHESTRATOR   │  enqueue/await       │   JOB QUEUE (Redis/BullMQ) │
│  workflow+state │◄────────────────────►│   async jobs + retry       │
└───────┬─────────┘                      └─────────┬─────────────────┘
        │                                          │
        │                              ┌───────────▼───────────┐
        │                              │       WORKERS          │
        │                              │  jalankan Agent + Tool │
        │                              └───────────┬───────────┘
        │                                          │
┌───────▼──────────────────────────────────────────▼───────────────┐
│                          AGENT LAYER                               │
│  Research · BrandVoice · Strategy · Script · Carousel · Video      │
└───────────────────────────────┬──────────────────────────────────┘
                                 │  (MODEL ROUTER)
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   LLM (Claude)│      │   TOOL ADAPTERS   │      │  STORAGE          │
│ Opus/Sonnet/  │      │ IG·MetaAdsLibrary │      │ Postgres + S3     │
│ Haiku         │      │ Canva·Higgsfield  │      │ (data + aset)     │
└───────────────┘      └──────────────────┘      └──────────────────┘
```

**Prinsip:**
- Permintaan berat (riset, video) → **async job** lewat queue; respon cepat (chat ringan, draft script) bisa sinkron/streaming.
- **Brand Context** di-inject ke setiap agent (voice profile + brand kit + kompetitor).
- **Tool adapter** membungkus MCP tools → agent tidak terikat provider.
- **Cost guard**: setiap job punya estimasi & catatan biaya kredit.

---

## 3. Interaction Model (chat-first, ala Vamos)

Setiap brand punya **conversation thread**. User mengetik perintah natural; orchestrator memutuskan agent/tool mana yang dipanggil, lalu menstream hasil. Output yang "berbobot" (script, carousel, video) juga tersimpan sebagai **artifact** terstruktur yang bisa di-review/approve di luar chat.

```
User: "Riset 3 kompetitor ini: @brandA @brandB @brandC, fokus serum wajah"
   → Orchestrator → Research Agent → IG + Meta Ads Library
   → balas insight + simpan ResearchReport + 15 ContentIdea

User: "Buatkan 3 script Reels 30 detik dari ide #4, pakai voice brand kita"
   → Script Agent (inject BrandVoiceProfile) → 3 variant → simpan Script artifact

User: "Jadikan carousel 7 slide dari script varian 2"
   → Carousel Agent → copy + Canva design → Carousel artifact

User: "Bikin videonya dari script varian 1"
   → Video Agent → Higgsfield (scene+voice) → Video artifact (async job)
```

---

## 4. Data Model

Notasi: TypeScript-style untuk keterbacaan; implementasi di Postgres (kolom JSONB untuk field fleksibel). Semua entitas ber-`id` (uuid), `createdAt`, `updatedAt`, dan multi-tenant via `orgId`.

```ts
// ── Tenant & user ──────────────────────────────────────────────
interface Organization { id; name; plan: 'agency'|'saas'; }      // akun (agency/klien)
interface User { id; orgId; email; name; role: 'owner'|'editor'|'viewer'; }

// ── Brand (≈ workspace, ≈ Vamos "Brand Profile") ───────────────
interface Brand {
  id; orgId; name; niche; description;
  platforms: ('instagram'|'tiktok')[];
  status: 'active'|'archived';
}

interface BrandVoiceProfile {              // diekstrak dari contoh konten / link sosial
  id; brandId;
  toneAttributes: string[];                // mis. ["fresh","premium","meyakinkan"]
  styleSummary: string;                    // ringkasan voice yg dipakai sbg system prompt
  vocabulary: { preferred: string[]; avoid: string[] };
  sampleSources: { type:'text'|'url'|'transcript'; ref: string }[];
  doDont: { do: string[]; dont: string[] };
  status: 'draft'|'ready';
}

interface BrandKit {
  id; brandId; logoUrl?;
  colors: string[];                        // hex
  fonts: string[];
  visualGuidelines?: string;
  canvaBrandTemplateId?: string;
}

interface Competitor {
  id; brandId; handle; platform:'instagram'|'tiktok';
  notes?;
}

// ── Riset (Pilar 1) ────────────────────────────────────────────
interface ResearchReport {
  id; brandId; jobId;
  type: 'organic'|'ads'|'trend'|'mixed';
  inputs: { competitors?: string[]; keywords?: string[] };
  findings: {                              // JSONB
    topPosts?: any[]; activeAds?: any[];
    hookPatterns?: string[]; postingCadence?: any;
    contentGaps?: string[];
  };
  hookBank: string[];
  createdAt;
}

interface ContentIdea {
  id; brandId; sourceReportId?;
  angle; hook; format: 'reel'|'carousel'|'video';
  rationale?;
}

// ── Produksi (Pilar 2–4) ───────────────────────────────────────
interface ContentProject {                 // satu unit kerja
  id; brandId;
  title; brief?;
  type: 'script'|'carousel'|'video';
  sourceIdeaId?;
  status: 'draft'|'in_review'|'approved'|'exported';
}

interface Script {
  id; projectId; platform:'reel'|'tiktok';
  variants: {
    label; hook; body; cta;
    shotList: { scene:number; visual; narration; durationSec }[];
    durationSec;
  }[];
  version: number;
}

interface Carousel {
  id; projectId;
  slides: { index; type:'cover'|'value'|'cta'; copy; designAssetId? }[];
  designExportUrl?;                        // dari Canva
  aspectRatio: '4:5'|'1:1';
}

interface Video {
  id; projectId; scriptId; scriptVariant: number;
  scenes: { index; prompt; mediaJobId?; mediaUrl? }[];
  voiceoverAssetId?; subtitleUrl?; musicAssetId?;
  assemblyUrl?; aspectRatio: '9:16';
  status: 'queued'|'generating'|'assembled'|'failed';
}

interface Asset {
  id; brandId; type:'image'|'video'|'audio'|'design';
  url; source:'higgsfield'|'canva'|'upload'; meta?;
}

// ── Orkestrasi & chat ──────────────────────────────────────────
interface Job {
  id; brandId; projectId?;
  agent: 'research'|'brandvoice'|'strategy'|'script'|'carousel'|'video';
  status:'queued'|'running'|'succeeded'|'failed';
  input; output?; error?;
  costCredits?: number; tokensUsed?: number;
}

interface Conversation { id; brandId; title; }
interface Message {
  id; conversationId; role:'user'|'assistant'|'tool';
  content; artifactRefs?: { kind:'script'|'carousel'|'video'|'research'; id }[];
}
```

### Relasi inti
```
Organization 1─* Brand 1─1 BrandVoiceProfile
                 Brand 1─1 BrandKit
                 Brand 1─* Competitor
                 Brand 1─* ResearchReport 1─* ContentIdea
                 Brand 1─* ContentProject ──< Script | Carousel | Video
                 Brand 1─* Asset
                 Brand 1─* Conversation 1─* Message
Job *─1 Brand   (melacak setiap eksekusi agent)
```

---

## 5. Desain Agent

Setiap agent = fungsi murni `(input, brandContext, tools) → output terstruktur`. Orchestrator memilih agent berdasarkan intent (dari chat) atau pemanggilan API langsung.

| Agent | Tugas | Model (default) | Tools |
|---|---|---|---|
| **BrandVoice** | Ekstrak voice profile dari contoh/link | Sonnet 4.6 | IG (ambil konten), LLM |
| **Research** | Riset organik + iklan → insight & ide | Haiku 4.5 (rangkum) + Sonnet (sintesis) | IG (Composio), **Meta Ads Library**, virality predictor |
| **Strategy** | Angle, content pillar, kalender | Sonnet 4.6 | LLM |
| **Script** | Naskah multi-varian per platform | **Opus 4.8** | LLM + BrandVoiceProfile |
| **Carousel** | Copy slide + desain | Opus 4.8 (copy) | LLM + **Canva** |
| **Video** | Storyboard → scene → voice → assembly | Sonnet (storyboard) | **Higgsfield** |

**Brand Context** (di-inject ke semua agent):
```ts
type BrandContext = {
  brand: Brand;
  voice: BrandVoiceProfile;   // styleSummary → bagian dari system prompt
  kit: BrandKit;
  competitors: Competitor[];
};
```

**Orchestrator** bertanggung jawab:
- Intent routing (chat → agent).
- State machine per project: `draft → in_review → approved → exported` dengan **approval gate** manual.
- Memecah pekerjaan berat jadi job async (riset, video), respons ringan via streaming.
- Retry per tahap; mencatat biaya/credits per job.

---

## 6. Model Routing

Tujuan: kualitas tinggi di tugas menulis, hemat di tugas volume/riset.

| Jenis tugas | Model | Alasan |
|---|---|---|
| Script, carousel copy (kualitas kreatif) | `claude-opus-4-8` | Output paling tajam, langsung dipakai produksi |
| Strategi, sintesis riset, ekstrak voice | `claude-sonnet-4-6` | Seimbang kualitas/biaya |
| Klasifikasi, ringkasan banyak post/komentar, ekstraksi | `claude-haiku-4-5` | Volume tinggi, murah & cepat |

Router membaca `agent` + ukuran/jenis input → pilih model; bisa di-override per request. Catat `tokensUsed` & `costCredits` di `Job`.

---

## 7. Kontrak API (REST)

Base: `/api/v1`. Auth: Bearer token; setiap request ter-scope ke `orgId`; `brandId` wajib untuk operasi brand.

### Brand & Voice
```http
POST /brands                      → buat brand            { name, niche, platforms }
GET  /brands/:id
POST /brands/:id/voice-profile    → ekstrak voice
     body: { samples?: {type,ref}[], socialLinks?: string[] }
     → 202 { jobId }              # async; hasil BrandVoiceProfile
GET  /brands/:id/voice-profile
PUT  /brands/:id/kit              → set brand kit
POST /brands/:id/competitors      → tambah kompetitor
```

### Pilar 1 — Research
```http
POST /brands/:id/research
     body: { competitors: string[], keywords?: string[], sources: ('organic'|'ads')[] }
     → 202 { jobId }
GET  /research/:reportId          → ResearchReport + ContentIdea[]
GET  /brands/:id/ideas            → daftar ide konten
```

### Pilar 2 — Script
```http
POST /projects                    → buat project { brandId, type:'script', sourceIdeaId?, brief? }
POST /projects/:id/script
     body: { platform:'reel'|'tiktok', durationSec, variants:3, tone? }
     → 200 { script }             # streaming; cepat → sinkron
```

### Pilar 3 — Carousel
```http
POST /projects/:id/carousel
     body: { slideCount:7, topic, useBrandKit:true }
     → 202 { jobId }              # desain Canva async
GET  /carousels/:id               → Carousel + designExportUrl
```

### Pilar 4 — Video
```http
POST /projects/:id/video
     body: { scriptId, variant:1, aspectRatio:'9:16', voice?, language:'id' }
     → 202 { jobId }
GET  /videos/:id                  → Video (status, assemblyUrl)
```

### Orkestrasi & Chat
```http
POST /conversations               → { brandId, title? }
POST /conversations/:id/messages  → { content }   # SSE stream balasan + artifactRefs
GET  /jobs/:jobId                  → status + output + costCredits
POST /projects/:id/approve         → ubah status → approved
POST /projects/:id/export          → { format } → URL hasil
```

**Pola async (job):** endpoint berat balas `202 { jobId }`. Client polling `GET /jobs/:jobId` atau menerima update via SSE. Job menyimpan `status`, `output`, `costCredits`.

---

## 8. Pemetaan Tool (MCP) → Agent

| Kebutuhan | Tool (MCP) | Dipakai oleh |
|---|---|---|
| Riset organik IG | `Instagram (Composio)` | Research, BrandVoice |
| Riset iklan kompetitor | `Facebook Meta Ads` → `ads_library_search` | Research |
| Prediksi viral | `Higgsfield` → `virality_predictor` | Research |
| Generate video/scene | `Higgsfield` → `generate_video` / `generate_image` | Video |
| Voice-over / dubbing | `Higgsfield` → `generate_audio` / `dubbing` | Video |
| Reframe / upscale | `Higgsfield` → `reframe` / `upscale_video` | Video |
| Desain carousel | `Canva` → `generate-design` / brand templates / `export-design` | Carousel |
| Arsip & report | `Notion` / `Google Drive` / `Gamma` | (fase 2) |

> Setiap tool dibungkus **adapter** dengan interface seragam (`run(input) → {output, costCredits}`) + retry & error mapping, agar agent tidak terikat MCP spesifik. **TikTok**: belum ada tool resmi → di MVP, riset TikTok manual/di-skip, publishing via export.

---

## 9. Non-Fungsional (MVP)

| Aspek | Keputusan MVP |
|---|---|
| Multi-tenant | Isolasi data per `orgId`/`brandId` di semua query (row-level scope) |
| Async | Redis + BullMQ; worker terpisah untuk job berat (riset, video) |
| Streaming | SSE untuk chat & draft script |
| Cost guard | Estimasi credits sebelum job video; catat aktual di `Job`; batas per brand |
| Storage | Postgres (data) + S3-compatible (aset video/gambar/desain) |
| Observability | Log per job (agent, model, tokens, credits, durasi, error) |
| Keamanan | Secrets tool di server; user tak pernah pegang kredensial MCP |

---

## 10. Tech Stack (final MVP)

| Lapisan | Pilihan |
|---|---|
| Frontend | Next.js + React + Tailwind + SSE client |
| Backend | NestJS (TypeScript) |
| Queue | Redis + BullMQ |
| DB | PostgreSQL (Prisma ORM) |
| Object storage | S3-compatible (mis. Cloudflare R2) |
| LLM | Claude (Opus 4.8 / Sonnet 4.6 / Haiku 4.5) via model router |
| Tools | MCP adapters: Instagram, Meta Ads, Higgsfield, Canva |

---

## 11. Rencana Build Fase 1 (urutan)

| Sprint | Fokus | Deliverable |
|---|---|---|
| 1 | Fondasi | Auth, Org/Brand/User, multi-tenant, chat shell, job queue |
| 2 | Brand Voice | Ekstrak voice profile dari contoh/link, brand kit |
| 3 | **Research Agent** | Organik IG + Meta Ads Library → ResearchReport + ideas |
| 4 | **Script Engine** | Multi-varian per platform, streaming, approval, export |
| 5 | **Carousel Engine** | Copy slide + desain Canva + export |
| 6 | **Video Engine** | Storyboard → Higgsfield scene + voice → assembly 9:16 |
| 7 | Polish | Cost guard, error handling, asset library, QA end-to-end |

> Urutan ini sesuai PRD: Riset → Script → Carousel → Video (video paling berat, terakhir).

---

## 12. Pertanyaan Terbuka (teknis)

1. **Sumber data riset**: cukup Instagram (Composio) + Meta Ads Library, atau perlu provider scraping tambahan untuk kedalaman (transkrip video, komentar masif)?
2. **Brand voice**: ekstrak dari URL sosial otomatis (perlu akses konten) atau cukup paste contoh teks manual di MVP?
3. **Penyimpanan aset**: R2/S3 pilihan mana yang sudah Anda punya?
4. **Batas biaya**: berapa credits/biaya maksimum per video & per brand/bulan sebagai guard?
5. **Skema kredit Higgsfield/Canva**: pakai 1 akun pusat (agency) atau per-brand?

---

_Spec ini untuk MVP internal (done-for-you). Setelah disepakati, lanjut ke: skema DB final (Prisma), definisi prompt tiap agent, dan implementasi Sprint 1._
