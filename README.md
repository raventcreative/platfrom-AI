# ProdPilot — AI Content Automation Platform untuk Multi-Brand

Platform di mana **AI agent mengotomasi produksi konten untuk banyak brand sekaligus** — dari riset kompetitor sampai aset siap publikasi. Satu tim bisa menjalankan puluhan brand secara paralel.

**Model bisnis:** Hybrid — mulai sebagai agency/done-for-you, lalu produktisasi menjadi SaaS.

## Empat pilar produk

1. **Competitor & Market Intelligence** — riset organik + iklan kompetitor (Meta Ads Library) → insight & ide konten.
2. **Script Engine** — naskah video Reels/TikTok: hook → body → CTA + shot list.
3. **Carousel Engine** — copy slide-per-slide + desain carousel konsisten brand (Canva).
4. **AI Video Engine** — video dari script + voice-over + subtitle + assembly (Higgsfield).

**Platform fokus:** Instagram & TikTok.

## Dokumen

- 📄 [Product Requirements Document (PRD)](docs/PRD.md) — visi, model bisnis, empat pilar, arsitektur agent, integrasi, roadmap.
- 🛠️ [Technical Spec — MVP Fase 1](docs/TECH_SPEC_MVP.md) — arsitektur, data model, desain agent, kontrak API, model routing, rencana build.
- 🚀 [Development — Sprint 1](docs/DEVELOPMENT.md) — cara setup & jalankan scaffold lokal.

Referensi produk sejenis: [Vamos AI](https://getvamos.ai/) — chat-first, brand voice profile, riset terintegrasi, multi-brand.

## Struktur (monorepo)

```
apps/
  api/   NestJS + Prisma + BullMQ   (REST API + job worker)
  web/   Next.js + Tailwind          (chat-first UI)
docs/    PRD, tech spec, panduan dev
docker-compose.yml                   Postgres + Redis (dev)
```

## Status

🚧 **Sprint 1 (Fondasi) — scaffold selesai:** auth, multi-tenant Org/Brand/User,
brand voice/kit, chat shell, job queue. Agent asli (research/script/carousel/
video) menyusul di Sprint 2+. Lihat [DEVELOPMENT.md](docs/DEVELOPMENT.md) untuk menjalankan.
