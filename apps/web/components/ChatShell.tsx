'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

type Message = { id: string; role: string; content: string; jobId?: string };

export function ChatShell({ brandId }: { brandId?: string }) {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
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

  async function send() {
    if (!conversationId || !input.trim() || busy) return;
    setBusy(true);
    const content = input.trim();
    setInput('');
    try {
      const res = await api.postMessage(conversationId, content);
      setMessages((m) => [...m, res.userMessage, res.assistantMessage]);
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
            Mulai dengan perintah, mis. &ldquo;Riset 3 kompetitor: @brandA @brandB
            @brandC&rdquo; atau &ldquo;Buatkan 3 script Reels 30 detik&rdquo;.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'USER' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
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
