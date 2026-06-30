# Development — Sprint 1 Scaffold

Monorepo (npm workspaces):

```
apps/
  api/   NestJS + Prisma + BullMQ   (REST API + job worker)
  web/   Next.js + Tailwind          (chat-first UI)
docs/    PRD, tech spec, dokumen ini
docker-compose.yml   Postgres + Redis untuk dev lokal
```

## Yang sudah ada di Sprint 1

- **Auth** — Bearer token = `User.apiToken` (`AuthGuard`).
- **Multi-tenant** — semua query ter-scope ke `orgId`.
- **Org/Brand/User** — model + endpoint `GET /me`, CRUD brand dasar.
- **Brand Voice Profile & Brand Kit** — sudah di schema + diisi oleh seed.
- **Chat shell** — `Conversation`/`Message`, kirim pesan → buat Job → balasan placeholder.
- **Job queue** — BullMQ (`agent-jobs`) + worker stub (`JobsProcessor`).

> Agent asli (research/script/carousel/video) **belum** diimplementasi — itu Sprint 3+. Worker saat ini hanya menandai job `SUCCEEDED` dengan output placeholder.

## Prasyarat

- Node.js 20+
- Docker (untuk Postgres + Redis), atau Postgres/Redis lokal.

## Langkah jalan (lokal)

```bash
# 1. Infra
docker compose up -d            # postgres:5432, redis:6379

# 2. Dependencies (root, workspaces)
npm install

# 3. Env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 4. DB: generate client, migrate, seed
npm run prisma:generate -w @prodpilot/api
npm run prisma:migrate  -w @prodpilot/api     # buat tabel
npm run db:seed         -w @prodpilot/api     # org + user + brand contoh

# 5. Jalankan
npm run dev:api                 # http://localhost:4000/api/v1
npm run dev:web                 # http://localhost:3000
```

Seed mencetak **API token** (`dev-token-123`) dan **brand id** contoh.

## Cek cepat (smoke test)

```bash
TOKEN=dev-token-123
BASE=http://localhost:4000/api/v1

curl $BASE/health
curl -H "Authorization: Bearer $TOKEN" $BASE/me
curl -H "Authorization: Bearer $TOKEN" $BASE/brands

# Buat percakapan + kirim pesan (ganti BRAND_ID dari /brands)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"brandId":"BRAND_ID","title":"Tes"}' $BASE/conversations

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"Riset kompetitor @brandA"}' $BASE/conversations/CONVO_ID/messages

# Cek status job (jobId dari respons di atas)
curl -H "Authorization: Bearer $TOKEN" $BASE/jobs/JOB_ID
```

Di UI: buka http://localhost:3000 → pilih brand di kanan atas → ketik perintah di chat.

## Endpoint Sprint 1

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | status API + DB (publik) |
| GET | `/me` | user + org saat ini |
| GET | `/brands` | daftar brand di org |
| POST | `/brands` | buat brand |
| GET | `/brands/:id` | detail brand (+ voice, kit, kompetitor) |
| POST | `/conversations` | buat percakapan untuk brand |
| GET | `/conversations?brandId=` | daftar percakapan brand |
| GET | `/conversations/:id/messages` | pesan dalam percakapan |
| POST | `/conversations/:id/messages` | kirim pesan → enqueue job |
| GET | `/jobs/:id` | status & output job |

## Berikutnya (Sprint 2+)

MVP = **Content Engine** (lihat [Handbook](CONTENT_ENGINE_HANDBOOK.md) & [TECH_SPEC_MVP.md §11](TECH_SPEC_MVP.md)):
Intake + Brand Profile → Prompt Engine (system prompt + playbook + compliance) → Generator inti (script + carousel copy) → Generator lengkap (storyboard/caption/ide) → Compliance & QA.

> Pilar berat (Research/Meta Ads, desain Canva, Video Higgsfield) = **Fase 2+**.
