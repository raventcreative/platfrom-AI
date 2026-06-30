'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

type Message = { id: string; role: string; content: string; jobId?: string };
type Provider = 'anthropic' | 'openai';

const MODELS: { value: Provider; label: string }[] = [
  { value: 'anthropic', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'ChatGPT (OpenAI)' },
];

export function ChatShell({ brandId }: { brandId?: string }) {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!brandId) return;
    setMessages([]);
    setConversationId(undefined);
    api
      .listConversations(brandId)
      .then(async (cs: { id: string }[]) => {
        const convo = cs[0] ?? (await api.createConversation(brandId, 'Sesi pertama'));
        setConversationId(convo.id);
        const msgs = await api.getMessages(convo.id);
        setMessages(msgs);
      })
      .catch(() => {});
  }, [brandId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function patchMessage(id: string, content: string) {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, content } : x)));
  }

  // Poll the generation job until it finishes, then show the result.
  async function pollJob(messageId: string, jobId: string) {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const job = await api.getJob(jobId);
        if (job.status === 'SUCCEEDED') {
          patchMessage(messageId, job.output?.readable ?? '(kosong)');
          return;
        }
        if (job.status === 'FAILED') {
          patchMessage(messageId, `Generate gagal: ${job.error ?? 'unknown'}`);
          return;
        }
      } catch {
        // keep polling
      }
    }
    patchMessage(messageId, 'Timeout menunggu hasil. Coba cek lagi nanti.');
  }

  async function send() {
    if (!conversationId || !input.trim() || busy) return;
    setBusy(true);
    const content = input.trim();
    setInput('');
    try {
      const res = await api.postMessage(conversationId, content, provider);
      setMessages((m) => [...m, res.userMessage, res.assistantMessage]);
      if (res.jobId) {
        void pollJob(res.assistantMessage.id, res.jobId);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: `err-${m.length}`, role: 'ASSISTANT', content: `Error: ${e}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!brandId) {
    return <div className="p-6 text-neutral-500">Pilih brand untuk mulai.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-sm text-neutral-400">
            Mulai dengan perintah, mis. &ldquo;Buatkan script Reels 30 detik promo
            bundling&rdquo;, &ldquo;Carousel 7 slide tips skincare&rdquo;, atau
            &ldquo;7 ide konten minggu ini&rdquo;.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'USER' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-left text-sm ${
                m.role === 'USER'
                  ? 'bg-blue-600 text-white'
                  : 'border border-neutral-200 bg-white'
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-neutral-200 bg-white p-3">
        <div className="flex gap-2">
          <select
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            disabled={busy}
            aria-label="Pilih model"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Ketik perintah untuk agent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={busy}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? '...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
}
