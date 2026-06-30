const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';
const TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN ?? 'dev-token-123';

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  return res.json();
}

export const api = {
  me: () => req('/me'),
  listBrands: () => req('/brands'),
  createBrand: (body: { name: string; niche?: string; platforms?: string[] }) =>
    req('/brands', { method: 'POST', body: JSON.stringify(body) }),
  listConversations: (brandId: string) =>
    req(`/conversations?brandId=${encodeURIComponent(brandId)}`),
  createConversation: (brandId: string, title?: string) =>
    req('/conversations', {
      method: 'POST',
      body: JSON.stringify({ brandId, title }),
    }),
  getMessages: (id: string) => req(`/conversations/${id}/messages`),
  postMessage: (
    id: string,
    content: string,
    provider?: 'anthropic' | 'openai',
  ) =>
    req(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(provider ? { provider } : {}) }),
    }),
  getJob: (id: string) => req(`/jobs/${id}`),
};
