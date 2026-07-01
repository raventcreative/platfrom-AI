'use client';

// ModelSettings: modal pengaturan LLM (provider, API key, model).
// API key hanya disimpan di browser dan dikirim per-request, tidak ke server.

import { useState } from 'react';
import {
  MODEL_OPTIONS,
  PROVIDER_LABEL,
  type LlmSettings,
  type Provider,
} from '../lib/llmSettings';

const PROVIDERS: Provider[] = ['anthropic', 'openai'];

/**
 * Modal pengaturan model. Menyunting salinan `settings` (draft) secara lokal,
 * lalu meneruskannya via `onSave` saat pengguna menyimpan.
 */
export function ModelSettings({
  settings,
  onSave,
  onClose,
}: {
  settings: LlmSettings;
  onSave: (s: LlmSettings) => void;
  onClose: () => void;
}) {
  // Draft = salinan lokal setting agar perubahan tidak langsung diterapkan
  // sebelum pengguna menekan "Simpan".
  const [draft, setDraft] = useState<LlmSettings>(settings);
  const p = draft.provider;

  // Terapkan patch parsial ke draft (merge dangkal).
  function set(patch: Partial<LlmSettings>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-brand-line bg-brand-panel p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold">Pengaturan model</h3>
        <p className="mt-1 text-xs text-brand-muted">
          API key disimpan di browser ini saja dan dikirim per-request. Tidak
          disimpan di server. Kosongkan untuk pakai <b>mode demo</b>.
        </p>

        <label className="mt-4 block text-[13px] font-semibold text-brand-text">Provider</label>
        <select
          className="mt-1 w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent"
          value={p}
          onChange={(e) => set({ provider: e.target.value as Provider })}
        >
          {PROVIDERS.map((pv) => (
            <option key={pv} value={pv}>{PROVIDER_LABEL[pv]}</option>
          ))}
        </select>

        <label className="mt-3 block text-[13px] font-semibold text-brand-text">
          {p === 'openai' ? 'OpenAI API key' : 'Anthropic API key'}
        </label>
        {/* API key per-provider disimpan di objek keys yang di-index oleh provider aktif. */}
        <input
          type="password"
          autoComplete="off"
          placeholder={p === 'openai' ? 'sk-...' : 'sk-ant-...'}
          className="mt-1 w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent"
          value={draft.keys[p]}
          onChange={(e) => set({ keys: { ...draft.keys, [p]: e.target.value } })}
        />

        <label className="mt-3 block text-[13px] font-semibold text-brand-text">Model</label>
        <select
          className="mt-1 w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent"
          value={draft.models[p]}
          onChange={(e) => set({ models: { ...draft.models, [p]: e.target.value } })}
        >
          {MODEL_OPTIONS[p].map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-brand-line px-3 py-2 text-sm hover:bg-white/5"
          >
            Batal
          </button>
          <button
            onClick={() => onSave(draft)}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accentHover"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
