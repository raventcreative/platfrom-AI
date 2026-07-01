// Klien HTTP tipis untuk backend API v1.
// Semua request lewat helper req() yang menempelkan header auth & JSON.

// Payload create/update brand yang dikirim ke endpoint /brands.
export type BrandInput = {
  name?: string;
  niche?: string;
  description?: string;
  category?: 'skincare' | 'fnb' | 'fashion' | 'service' | 'other';
  platforms?: ('instagram' | 'tiktok')[];
  profile?: Record<string, unknown>; // termasuk profile.skus (array produk)
};

// Base URL API; fallback ke localhost saat env var tidak diset (dev lokal).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';
// Token dev; fallback ke token statis untuk kemudahan development.
const TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN ?? 'dev-token-123';

// Wrapper fetch: gabung header default, cek status, kembalikan JSON.
async function req(path: string, init?: RequestInit) {
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
  return res.json();
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
  insight: (body: {
    type:
      | 'competitor'
      | 'ig_audit'
      | 'inspiration'
      | 'education'
      | 'content_intel'
      | 'ig_insight'
      | 'ig_research';
    brandId?: string;
    params?: Record<string, string>;
    provider?: 'anthropic' | 'openai';
    apiKey?: string;
    model?: string;
  }) => req('/insights/run', { method: 'POST', body: JSON.stringify(body) }),
  // Jalankan job generate konten dengan agent & konteks brand tertentu.
  generate: (body: {
    brandId: string;
    agent: 'SCRIPT' | 'CAROUSEL' | 'STORYBOARD' | 'CAPTION' | 'IDEAS';
    input?: string;
    provider?: 'anthropic' | 'openai';
    apiKey?: string;
    model?: string;
  }) => req('/jobs/generate', { method: 'POST', body: JSON.stringify(body) }),
  // Otomasi: brief → JSON spec → reel/post final.
  automate: (body: {
    brandId?: string;
    brief: string;
    format: 'reels' | 'carousel' | 'post';
    platform?: string;
    provider?: 'anthropic' | 'openai';
    apiKey?: string;
    model?: string;
  }) => req('/automation/run', { method: 'POST', body: JSON.stringify(body) }),
};
