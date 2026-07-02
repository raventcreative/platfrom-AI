// Klien HTTP tipis + TYPE-SAFE untuk backend API v1.
//
// Tipe request bersumber dari KONTRAK OpenAPI backend (apps/web/lib/api.gen.ts),
// yang di-generate dari NestJS via `npm run gen:api`. Ubah DTO di backend →
// jalankan gen:api → tipe di sini ikut berubah, dan pemanggil yang tak sesuai
// langsung error saat compile. Inilah "jembatan" backend↔frontend yang mudah.
//
// Dua field di-override karena plugin Swagger salah meng-infer:
//   - Brand.platforms  → seharusnya array
//   - Insight.params   → seharusnya Record<string,string>
import type { components } from './api.gen';

// Semua skema DTO dari kontrak backend (auto-sync).
export type ApiSchemas = components['schemas'];

// Payload create/update brand. Semua opsional (dipakai untuk create & edit),
// dengan platforms dikoreksi jadi array.
export type BrandInput = Partial<Omit<ApiSchemas['CreateBrandDto'], 'platforms'>> & {
  platforms?: ('instagram' | 'tiktok')[];
};

// Payload insight dengan params yang dikoreksi jadi peta string→string.
export type InsightInput = Omit<ApiSchemas['InsightDto'], 'params'> & {
  params?: Record<string, string>;
};

// Payload lain diambil apa adanya dari kontrak (sudah akurat).
export type GenerateInput = ApiSchemas['GenerateDto'];
export type AutomateInput = ApiSchemas['AutomateDto'];
export type ImageInput = ApiSchemas['GenerateImageDto'];

// Base URL API; fallback ke localhost saat env var tidak diset (dev lokal).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';
// Token dev; fallback ke token statis untuk kemudahan development.
const TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN ?? 'dev-token-123';

// Wrapper fetch: gabung header default, cek status, kembalikan JSON.
// Generik <T> = tipe response yang diharapkan (default any agar kompatibel).
async function req<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`, // token bearer untuk autentikasi backend
      ...(init?.headers ?? {}),
    },
    cache: 'no-store', // selalu ambil data segar, tanpa cache browser/Next
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Kumpulan endpoint API yang dipakai UI.
export const api = {
  // Ambil profil user saat ini.
  me: () => req('/me'),
  // Daftar semua brand.
  listBrands: () => req('/brands'),
  // Ambil satu brand berdasarkan id.
  getBrand: (id: string) => req(`/brands/${id}`),
  // Buat brand baru.
  createBrand: (body: BrandInput) =>
    req('/brands', { method: 'POST', body: JSON.stringify(body) }),
  // Perbarui sebagian field brand (PATCH).
  updateBrand: (id: string, body: BrandInput) =>
    req(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  // Daftar percakapan milik sebuah brand.
  listConversations: (brandId: string) =>
    req(`/conversations?brandId=${encodeURIComponent(brandId)}`),
  // Buat percakapan baru untuk brand (judul opsional).
  createConversation: (brandId: string, title?: string) =>
    req('/conversations', {
      method: 'POST',
      body: JSON.stringify({ brandId, title }),
    }),
  // Ambil pesan-pesan dalam satu percakapan.
  getMessages: (id: string) => req(`/conversations/${id}/messages`),
  // Kirim pesan baru ke percakapan (provider LLM opsional).
  postMessage: (
    id: string,
    content: string,
    provider?: 'anthropic' | 'openai',
  ) =>
    req(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(provider ? { provider } : {}) }),
    }),
  // Cek status/hasil sebuah job.
  getJob: (id: string) => req(`/jobs/${id}`),
  // Riwayat generate (job terminal) sebuah brand, terbaru dulu.
  listJobs: (brandId: string) =>
    req(`/jobs?brandId=${encodeURIComponent(brandId)}`),
  // Hapus satu entri riwayat.
  deleteJob: (id: string) => req(`/jobs/${id}`, { method: 'DELETE' }),
  // Jalankan alat insight (kompetitor / audit IG / inspirasi / education).
  insight: (body: InsightInput) =>
    req('/insights/run', { method: 'POST', body: JSON.stringify(body) }),
  // Jalankan job generate konten dengan agent & konteks brand tertentu.
  generate: (body: GenerateInput) =>
    req('/jobs/generate', { method: 'POST', body: JSON.stringify(body) }),
  // Otomasi: brief → JSON spec → reel/post final.
  automate: (body: AutomateInput) =>
    req('/automation/run', { method: 'POST', body: JSON.stringify(body) }),
  // Otomasi GAMBAR: brief → prompt gambar → OpenAI Images → gambar.
  automateImage: (body: ImageInput) =>
    req('/automation/image', { method: 'POST', body: JSON.stringify(body) }),
  // Riwayat generasi gambar AI Automation (opsional per-brand).
  listAutomationImages: (brandId?: string) =>
    req(`/automation/images${brandId ? `?brandId=${encodeURIComponent(brandId)}` : ''}`),
  // Hapus satu entri riwayat gambar.
  deleteAutomationImage: (id: string) =>
    req(`/automation/images/${id}`, { method: 'DELETE' }),
};
