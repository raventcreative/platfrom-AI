---
name: run-dev
description: Jalankan stack dev ProdPilot (NestJS API + Next.js web + Postgres + Redis). Gunakan saat user minta "jalankan app", "start dev", "run server", cek app jalan, atau setup lokal dari nol.
---

# Menjalankan ProdPilot secara lokal

Stack: **Next.js** (`apps/web`, :3000) → **NestJS API** (`apps/api`, :4000) → **Postgres** + **Redis** (Docker) → **Prisma** ORM, **BullMQ** worker, **Content Engine** (Claude/ChatGPT).

Kerjakan langkah berikut secara berurutan. Lewati langkah yang sudah terpenuhi.

## 1. Dependencies
```bash
node -v            # butuh Node 20+
docker info        # daemon harus hidup; kalau mati: `open -a Docker` lalu tunggu
```
Kalau `node_modules` belum ada di root:
```bash
npm install
```

## 2. Prisma client
Kalau import `@prisma/client` gagal (tipe hilang) atau belum pernah generate:
```bash
npx prisma generate --schema apps/api/prisma/schema.prisma
```
> Jika download engine gagal dengan `unable to get local issuer certificate` (proxy/SSL),
> jalankan ulang dengan prefix `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## 3. Postgres + Redis (NATIVE / Homebrew — monolith)
Stack ini memakai **Postgres 17 & Redis native (Homebrew)**, bukan Docker
(container Docker sering ngadat di mesin ini). Data sudah dimigrasikan ke PG native.
```bash
npm run stack:up      # brew services start postgresql@17 + redis
brew services list    # keduanya harus "started"
```
- Postgres native: `localhost:5432`, role `prodpilot` / db `prodpilot`.
- Redis native: `localhost:6379` (ephemeral, tak perlu data).
- `apps/api/.env` → `DATABASE_URL=postgresql://prodpilot:prodpilot@localhost:5432/prodpilot`.

> Fallback Docker (tidak dipakai lagi): `npm run stack:up:docker` (memetakan Postgres
> ke port 5433 via [docker-compose.override.yml](../../../docker-compose.override.yml)
> untuk menghindari bentrok dengan PG native di 5432). Bila pindah ke Docker, ubah
> `DATABASE_URL` kembali ke `...@localhost:5433/...`.

### Setup PG native dari nol (bila role/db belum ada)
```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
psql -d postgres -c "CREATE ROLE prodpilot LOGIN PASSWORD 'prodpilot' CREATEDB;"
createdb -O prodpilot prodpilot
```
Migrasi data dari container lama (bila ada): `docker exec <pg-container> pg_dump -U prodpilot -d prodpilot --no-owner --no-acl | psql -U prodpilot -d prodpilot`.

## 4. Env + skema DB + seed
Kalau `apps/api/.env` belum ada, salin dari `.env.example` lalu set `DATABASE_URL` ke port **5433**:
```
DATABASE_URL=postgresql://prodpilot:prodpilot@localhost:5433/prodpilot
```
Lalu:
```bash
cd apps/api
npx prisma db push --skip-generate          # sinkron skema (dev; tanpa shadow DB)
export $(grep -v '^#' .env | grep -E '^(DATABASE_URL|REDIS)' | xargs)
npx ts-node prisma/seed.ts                  # seed org + brand + token `dev-token-123`
```
> `migrate dev` butuh shadow database; untuk dev pakai `db push` (lebih sederhana).
> `seed.ts` tidak auto-load `.env`, makanya `DATABASE_URL` di-export manual.

## 5. Jalankan server (background)
```bash
npm run dev:api      # NestJS  :4000  (base path /api/v1)
npm run dev:web      # Next.js :3000
```

### ⚠️ LLM call → `fetch failed` (cegat TLS proxy)
Di jaringan dengan proxy/firewall yang mencegat TLS, panggilan ke Anthropic/OpenAI
gagal dengan `fetch failed` → cause `unable to get local issuer certificate`
(Node punya cert store sendiri, beda dari curl/macOS). Jalankan API dengan:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev:api
```
> Ini mematikan verifikasi TLS untuk proses itu (OK untuk dev). Cara aman/permanen:
> `NODE_EXTRA_CA_CERTS=/path/ke/corp-ca.pem npm run dev:api` (pakai CA proxy).
> Catatan: `ConfigModule` memuat `.env` saat boot — kalau ubah `.env` (mis. isi
> API key), **restart** `dev:api` biar termuat.
Cek sehat:
```bash
curl -s localhost:4000/api/v1/me -H "Authorization: Bearer dev-token-123"
```
Buka **http://localhost:3000**. Pilih brand → chat. Dropdown model (Claude/ChatGPT)
ada di bar input; default **mode demo** sampai API key diisi.

## 6. Pakai LLM sungguhan (opsional)
Set di `apps/api/.env` lalu restart API:
```
LLM_PROVIDER=anthropic          # atau "openai"
ANTHROPIC_API_KEY=sk-ant-...    # untuk Claude
OPENAI_API_KEY=sk-...           # untuk ChatGPT
```
Provider juga bisa dipilih per-pesan lewat dropdown di UI (menimpa default env).

## Kontrak API type-safe (OpenAPI → tipe TS)
Backend↔frontend disatukan lewat kontrak OpenAPI yang di-generate dari NestJS:
- **Swagger UI**: http://localhost:4000/api/v1/docs (uji endpoint dari browser)
- **Spec JSON**: http://localhost:4000/api/v1/docs-json
- **Generate tipe** untuk web (setelah ubah DTO backend):
  ```bash
  npm run gen:api   # build API → dump openapi.json → tulis apps/web/lib/api.gen.ts
  ```
  `gen:api` boot Nest dalam *preview mode* (tanpa DB/Redis), jadi bisa jalan
  walau infra mati. Setelah itu `apps/web/lib/api.ts` (typed client) otomatis
  memakai tipe baru — pemanggil yang tak sesuai langsung error saat compile.

## Matikan
```bash
# hentikan proses dev di terminalnya, lalu:
docker compose down             # tambah `-v` untuk hapus data DB
```

## Troubleshooting cepat
- **P1010 denied access** → konflik port 5432, lihat langkah 3.
- **Redis/ECONNREFUSED 6379** → `docker compose up -d`, cek `REDIS_HOST/PORT` di `.env`.
- **Job "sedang menyusun…" tak selesai** → worker BullMQ butuh Redis + API hidup; cek log API.
- **Web 401** → token tak cocok; seed memakai `dev-token-123` (default `NEXT_PUBLIC_DEV_TOKEN`).
