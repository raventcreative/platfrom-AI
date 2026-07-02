# Technical Spec — ProdPilot (MVP: Content Engine)

> **Status:** Draft v1.1
> **Tanggal:** 2026-06-30
> **Mengacu pada:** [PRD.md](PRD.md) §1.1 (Visi vs MVP), §6 (Empat Pilar), §13 (Roadmap) · [Content Engine Handbook](CONTENT_ENGINE_HANDBOOK.md) (spec MVP)
> **Referensi produk sejenis:** Vamos AI (getvamos.ai) — chat-first, brand voice profile, riset terintegrasi, model routing, multi-brand (agency plan)

Dokumen ini mendefinisikan **arsitektur, data model, desain agent, kontrak API, integrasi tool, dan model routing** untuk ProdPilot. Mengikuti framing PRD §1.1: **MVP = Content Engine** (§1–§1.1) dibangun lebih dulu; bagian arsitektur/data/agent/API/tool selebihnya mendeskripsikan **platform penuh (visi, Fase 2+)** dengan subset MVP ditandai per bagian.

---

## 1. Lingkup MVP — Content Engine

**Masuk (MVP):**
- **Multi-brand**: intake profil brand (1x/klien, modul per vertikal) + **Brand Voice Profile**.
- **Daily input** (fokus harian) → **generate** on-demand.
- **5 generator**: script Reels/TikTok, carousel IG (copy), storyboard video, caption+hashtag, ide konten mingguan + **Paket Lengkap**.
- **Knowledge Playbook** + **Compliance per vertikal** (BPOM/halal/SARA) disuntik ke tiap generate.
- **Output**: teks enak-dibaca + **blok JSON terstruktur**; **review & approve** manual; copy/export.
- **Antarmuka chat-first** per brand; **LLM-only** (belum perlu tool berat).
- **Model routing** (Sonnet default; Opus untuk kualitas tertinggi).

**Ditunda → Fase 2+ (lihat [PRD §13](PRD.md)):**
- **Pilar 1 — Research Agent** (organik IG + **Meta Ads Library**).
- **Pilar 3 — desain Carousel** (render Canva) — di MVP hanya **copy**.
- **Pilar 4 — Video Engine** (Higgsfield) — di MVP hanya **storyboard** (shoot pakai HP).
- Auto-publish/scheduler, integrasi TikTok resmi, billing/kuota SaaS, analytics performa, kolaborasi multi-user lanjutan.

---

## 1.1 Desain MVP — Content Engine

Inti MVP **bukan** multi-agent berat, tapi **satu persona AI** (Content Strategist) + **generator** per jenis output. Tiap generate = satu panggilan LLM dengan system prompt yang dirakit:

```
System Prompt = Persona
              + {{BRAND_PROFILE}}     (jawaban intake → "Label: nilai")
              + {{PLAYBOOK}}          (knowledge playbook, konstan)
              + {{COMPLIANCE_FOCUS}}  (aturan per vertikal: skincare/F&B/umum)
              + Self-check
User Prompt   = Generator instruction + {{DAILY_INPUT}}
```

**Komponen (mirror [Handbook §5–§8](CONTENT_ENGINE_HANDBOOK.md)):**
- `buildSystemPrompt(profile, category)` — gabung persona + profil + playbook + compliance.
- `complianceFocus(category)` — pilih aturan vertikal (BPOM / F&B / umum).
- `GENERATORS` — instruksi + skema JSON output per tipe (script/carousel/storyboard/caption/ideas).
- `buildBrandProfile(client)` / `buildDailyInput(d)` — map field intake → label.
- **LLM caller** — Anthropic Messages API; fallback **mode demo** kalau tak ada API key.

**Output tiap generate:** versi enak-dibaca + **blok JSON** (skema per tipe) → disimpan sebagai `Generation`, di-review/approve, copy/export.

**Tidak dibutuhkan di MVP:** Meta Ads Library, Higgsfield, render Canva, scraping. Hanya **LLM**. Tool berat masuk Fase 2.

---

## 2. Arsitektur Sistem

> _Diagram di bawah = **platform penuh (visi)**. Di **MVP (Content Engine)** jalurnya lebih ringkas: Client → API → **Prompt Engine + LLM** (generator). Queue dipakai untuk antrian generate, **tanpa** tool layer berat (Meta Ads / Higgsfield / Canva). Lihat §1.1._

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

> _**MVP:** contoh di bawah menampilkan alur **visi penuh**. Di MVP, perintah chat berkisar pada **generate** (script/carousel/storyboard/caption/ideas) dari profil brand + daily input; langkah **Riset** dan **Video** = Fase 2+._

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

> _**Entitas MVP (Content Engine):** `Organization`, `User`, `Brand` (+ `profile` JSONB dari intake), `BrandVoiceProfile`, `BrandKit`, `DailyInput`, `Generation`, `Conversation`, `Message`, `Job`. Entitas `Competitor`, `ResearchReport`, `ContentIdea`, `ContentProject`, `Script`/`Carousel`/`Video` (artifact terpisah), `Asset` = **Fase 2+** (di MVP, output cukup `Generation`; info kompetitor cukup di `Brand.profile`)._

```ts
// ── Tenant & user ──────────────────────────────────────────────
interface Organization { id; name; plan: 'agency'|'saas'; }      // akun (agency/klien)
interface User { id; orgId; email; name; role: 'owner'|'editor'|'viewer'; }

// ── Brand (≈ workspace, ≈ Vamos "Brand Profile") ───────────────
interface Brand {
  id; orgId; name; niche; description;
  platforms: ('instagram'|'tiktok')[];
  category: 'skincare'|'fnb'|'fashion'|'service'|'other';  // pilih modul intake/compliance
  profile?: any;                           // jawaban intake (JSONB, sumber: intake-schema)
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

// ── MVP: intake & generation ───────────────────────────────────
interface DailyInput {                     // diisi tiap pagi (per brand)
  id; brandId; date;
  focus; focusDetail; goal;                // fokus + detail + tujuan hari ini
  moment?; angle?; outputTypes: string[];  // momen/event, hook, jenis output
  platform?; notes?;
}

interface Generation {                     // output tiap generate (MVP)
  id; brandId; dailyInputId?;
  type: 'script'|'carousel'|'storyboard'|'caption'|'ideas';
  readable: string;                        // versi enak-dibaca
  json: any;                               // blok JSON terstruktur (skema per tipe)
  complianceNotes?: string;
  status: 'draft'|'approved'|'exported';
}

// ── Orkestrasi & chat ──────────────────────────────────────────
interface Job {
  id; brandId; projectId?;
  agent: 'brandvoice'|'script'|'carousel'|'storyboard'|'caption'|'ideas'   // MVP
       | 'research'|'strategy'|'video';                                    // Fase 2+
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
                 Brand 1─* DailyInput 1─* Generation        # MVP
                 Brand 1─* Competitor                       # Fase 2+
                 Brand 1─* ResearchReport 1─* ContentIdea   # Fase 2+
                 Brand 1─* ContentProject ──< Script | Carousel | Video   # Fase 2+
                 Brand 1─* Asset                            # Fase 2+
                 Brand 1─* Conversation 1─* Message
Job *─1 Brand   (melacak setiap eksekusi agent/generator)
```

---

## 5. Desain Agent

Setiap agent = fungsi murni `(input, brandContext, tools) → output terstruktur`. Orchestrator memilih agent berdasarkan intent (dari chat) atau pemanggilan API langsung.

> _**MVP (Content Engine):** tidak ada multi-agent berat — **satu persona** (Content Strategist) menjalankan **generator** (script / carousel-copy / storyboard / caption / ideas) via system prompt terakit (§1.1). `BrandVoice` opsional (cukup paste contoh caption di intake). Baris **Research**, **Video**, dan **Carousel-desain** di tabel = **Fase 2+**._

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

> _**MVP:** generator pakai **`claude-sonnet-4-6`** (default, hemat & cepat); **`claude-opus-4-8`** untuk kualitas tertinggi. Routing **Haiku** untuk volume (rangkum riset/komentar) relevan di **Fase 2** (Research)._

| Jenis tugas | Model | Alasan |
|---|---|---|
| Script, carousel copy (kualitas kreatif) | `claude-opus-4-8` | Output paling tajam, langsung dipakai produksi |
| Strategi, sintesis riset, ekstrak voice | `claude-sonnet-4-6` | Seimbang kualitas/biaya |
| Klasifikasi, ringkasan banyak post/komentar, ekstraksi | `claude-haiku-4-5` | Volume tinggi, murah & cepat |

Router membaca `agent` + ukuran/jenis input → pilih model; bisa di-override per request. Catat `tokensUsed` & `costCredits` di `Job`.

---

## 7. Kontrak API (REST)

Base: `/api/v1`. Auth: Bearer token; setiap request ter-scope ke `orgId`; `brandId` wajib untuk operasi brand.

> _Blok **Content Engine (MVP)** di bawah = endpoint yang aktif lebih dulu (semua generate lewat `/brands/:id/generate`). Blok **Pilar 1–4** & **project/approve/export** = model lebih kaya untuk **Fase 2+**; `/conversations` & `/jobs` tetap dipakai di MVP._

### Content Engine (MVP)
```http
GET  /schema                      → intake schema (sumber form, per vertikal)
POST /brands                      → buat brand + simpan profil intake   { name, category, profile }
PUT  /brands/:id/profile          → update jawaban intake (JSONB)
POST /brands/:id/generate
     body: { outputType:'script'|'carousel'|'storyboard'|'caption'|'ideas', dailyInput }
     → 200|202 { generation }     # ringan → sinkron/stream; berat → { jobId }
POST /brands/:id/generate-package → script + carousel + caption sekaligus (Paket Lengkap)
GET  /generations/:id             → Generation (readable + json + status)
POST /generations/:id/approve     → status → approved
```

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

> _**MVP (Content Engine) hanya butuh LLM (Anthropic).** Semua tool di tabel ini (IG / Meta Ads / Higgsfield / Canva) dipakai di **Fase 2+**. Di MVP, generator murni **prompt + LLM** (+ mode demo bila tak ada API key)._

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

## 11. Rencana Build (urutan)

**Fase 1 — MVP Content Engine:**

| Sprint | Fokus | Deliverable |
|---|---|---|
| 1 | Fondasi | Auth, Org/Brand/User, multi-tenant, chat shell, job queue — ✅ scaffold |
| 2 | Intake + Brand Profile | Intake schema per vertikal, profil brand lengkap, Brand Voice, Brand Kit |
| 3 | Prompt Engine | `buildSystemPrompt` (profil + playbook + compliance), LLM caller + mode demo |
| 4 | Generator inti | Script + Carousel (copy): output teks + JSON, review/approve, copy/export |
| 5 | Generator lengkap | Storyboard + Caption + Ide mingguan + Paket Lengkap |
| 6 | Compliance & QA | Self-check, compliance per vertikal diperketat, cost guard, QA end-to-end |

**Fase 2+ — Pilar berat (lihat [PRD §13](PRD.md) Fase 2):**

| Fokus | Deliverable |
|---|---|
| **Research Agent** | Organik IG + Meta Ads Library → ResearchReport + ideas, feed ke generator |
| **Carousel desain** | Render Canva brand-consistent + export gambar |
| **Video Engine** | Storyboard → Higgsfield scene + voice → assembly 9:16 |

> Build order MVP sesuai handbook: prompt + playbook + compliance → generator inti → generator lengkap → QA. Pilar berat (Research/Canva/Video) menyusul di Fase 2.

---

## 12. Pertanyaan Terbuka (teknis)

1. **Sumber data riset**: cukup Instagram (Composio) + Meta Ads Library, atau perlu provider scraping tambahan untuk kedalaman (transkrip video, komentar masif)?
2. **Brand voice**: ekstrak dari URL sosial otomatis (perlu akses konten) atau cukup paste contoh teks manual di MVP?
3. **Penyimpanan aset**: R2/S3 pilihan mana yang sudah Anda punya?
4. **Batas biaya**: berapa credits/biaya maksimum per video & per brand/bulan sebagai guard?
5. **Skema kredit Higgsfield/Canva**: pakai 1 akun pusat (agency) atau per-brand?

---

_MVP = Content Engine (done-for-you). Lanjutan: skema DB final (Prisma) untuk entitas MVP, definisi prompt tiap generator ([Handbook §5–§8](CONTENT_ENGINE_HANDBOOK.md)), implementasi Sprint 2 (intake + brand profile). Pilar berat = Fase 2+._
