'use client';

// BrandEditor: form buat/edit brand berbasis skema intake (INTAKE_SCHEMA).
// Field inti (name, category) jadi kolom terpisah, field lain masuk ke `profile`.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import {
  CORE_FIELDS,
  INTAKE_SCHEMA,
  type Category,
  type IntakeField,
  type Sku,
} from '../lib/brandSchema';

// Rangkai body brand: name+category ke kolom, field lain + daftar SKU ke profile.
function toBody(values: Record<string, string>, skus: Sku[]) {
  const profile: Record<string, unknown> = {};
  for (const section of INTAKE_SCHEMA) {
    for (const f of section.fields) {
      if (CORE_FIELDS.has(f.id)) continue;
      const v = (values[f.id] ?? '').trim();
      if (v) profile[f.id] = v;
    }
  }
  // Hanya simpan SKU yang punya nama; rapikan spasi tiap field.
  const cleanSkus = skus
    .filter((s) => s.name.trim())
    .map((s) => ({
      name: s.name.trim(),
      category: s.category?.trim() || undefined,
      price: s.price?.trim() || undefined,
      notes: s.notes?.trim() || undefined,
    }));
  if (cleanSkus.length) profile.skus = cleanSkus;

  return {
    name: (values.name ?? '').trim(),
    category: (values.category || 'other') as Category,
    profile,
  };
}

const EMPTY_SKU: Sku = { name: '', category: '', price: '', notes: '' };

/**
 * Editor brand. Tanpa `brandId` bertindak sebagai form pembuatan brand baru;
 * dengan `brandId` memuat data brand yang ada lalu memungkinkan pembaruan.
 */
export function BrandEditor({ brandId }: { brandId?: string }) {
  const router = useRouter();
  // Semua nilai field disimpan dalam satu map string->string (di-index oleh field id).
  const [values, setValues] = useState<Record<string, string>>({ category: 'other' });
  const [skus, setSkus] = useState<Sku[]>([]);
  const [loading, setLoading] = useState(Boolean(brandId));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>();

  useEffect(() => {
    // Mode edit: muat brand yang ada dan flatten profile ke dalam `values`.
    if (!brandId) return;
    api
      .getBrand(brandId)
      .then((b: { name: string; category: string; profile?: Record<string, unknown> }) => {
        // Pisahkan `skus` (array) dari field profile lain (string).
        const { skus: rawSkus, ...profileRest } = b.profile ?? {};
        setValues({
          name: b.name ?? '',
          category: (b.category ?? 'OTHER').toLowerCase(),
          ...(profileRest as Record<string, string>),
        });
        setSkus(Array.isArray(rawSkus) ? (rawSkus as Sku[]) : []);
      })
      .catch((e) => setMsg(`Gagal memuat: ${e}`))
      .finally(() => setLoading(false));
  }, [brandId]);

  // Helper edit daftar SKU.
  function addSku() {
    setSkus((s) => [...s, { ...EMPTY_SKU }]);
  }
  function updateSku(i: number, patch: Partial<Sku>) {
    setSkus((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeSku(i: number) {
    setSkus((s) => s.filter((_, idx) => idx !== i));
  }

  // Perbarui satu field berdasarkan id-nya.
  function setField(id: string, v: string) {
    setValues((s) => ({ ...s, [id]: v }));
  }

  // Simpan brand: update bila edit, atau create + redirect ke halaman brand baru.
  async function save() {
    const body = toBody(values, skus);
    if (!body.name) {
      setMsg('Nama brand wajib diisi.');
      return;
    }
    setSaving(true);
    setMsg(undefined);
    try {
      if (brandId) {
        await api.updateBrand(brandId, body);
        setMsg('Tersimpan ✓');
        toast(`Brand "${body.name}" tersimpan`);
      } else {
        const created = await api.createBrand(body);
        toast(`Brand "${body.name}" dibuat`);
        router.push(`/brands/${created.id}`);
        return;
      }
    } catch (e) {
      setMsg(`Gagal menyimpan: ${e}`);
      toast('Gagal menyimpan brand', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Kategori aktif dipakai untuk memfilter section skema yang bersifat vertical.
  const category = (values.category || 'other') as Category;

  if (loading) return <div className="p-6 text-sm text-brand-muted">Memuat…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/brands')}
          className="text-sm text-brand-muted hover:text-brand-text"
        >
          ← Semua brand
        </button>
        <div className="flex-1" />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan brand'}
        </button>
      </div>

      <h1 className="text-xl font-bold">
        {values.name?.trim() || (brandId ? '(tanpa nama)' : 'Brand baru')}
      </h1>
      {msg && <p className="text-sm text-brand-muted">{msg}</p>}

      {INTAKE_SCHEMA.filter((s) => !s.vertical || s.vertical === category).map((section) => (
        <div key={section.title} className="rounded-xl border border-brand-line bg-brand-panel p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
            {section.title}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((f) => (
              <FieldInput
                key={f.id}
                field={f}
                value={values[f.id] ?? ''}
                onChange={(v) => setField(f.id, v)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Produk / SKU — daftar produk brand (mis. sabun, skincare, parfum) */}
      <div className="rounded-xl border border-brand-line bg-brand-panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Produk / SKU
          </div>
          <div className="flex-1" />
          <button
            onClick={addSku}
            className="rounded-lg border border-brand-line px-3 py-1.5 text-sm hover:bg-white/5"
          >
            + Tambah produk
          </button>
        </div>

        {skus.length === 0 ? (
          <p className="text-sm text-brand-muted">
            Belum ada produk. Klik <b>+ Tambah produk</b> untuk mendaftar SKU
            (mis. Sabun, Skincare, Parfum).
          </p>
        ) : (
          <div className="space-y-2">
            {skus.map((s, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  className="rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent sm:col-span-4"
                  placeholder="Nama produk *"
                  value={s.name}
                  onChange={(e) => updateSku(i, { name: e.target.value })}
                />
                <input
                  className="rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent sm:col-span-3"
                  placeholder="Jenis (Sabun/Skincare/Parfum)"
                  value={s.category ?? ''}
                  onChange={(e) => updateSku(i, { category: e.target.value })}
                />
                <input
                  className="rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent sm:col-span-2"
                  placeholder="Harga"
                  value={s.price ?? ''}
                  onChange={(e) => updateSku(i, { price: e.target.value })}
                />
                <input
                  className="rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent sm:col-span-2"
                  placeholder="Catatan"
                  value={s.notes ?? ''}
                  onChange={(e) => updateSku(i, { notes: e.target.value })}
                />
                <button
                  onClick={() => removeSku(i)}
                  className="rounded-lg border border-brand-line px-2 py-2 text-sm text-red-300 hover:bg-red-500/10 sm:col-span-1"
                  aria-label="Hapus produk"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accentHover disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan brand'}
        </button>
      </div>
    </div>
  );
}

/** Input generik satu field skema; merender textarea/select/text sesuai `f.type`. */
function FieldInput({
  field: f,
  value,
  onChange,
}: {
  field: IntakeField;
  value: string;
  onChange: (v: string) => void;
}) {
  const cls =
    'w-full rounded-lg border border-brand-line bg-brand-bg text-brand-text px-3 py-2 text-sm outline-none focus:border-brand-accent';
  return (
    <div className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-[13px] font-semibold text-brand-text">{f.label}</label>
      {f.type === 'textarea' ? (
        <textarea className={`${cls} min-h-[64px] resize-y`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === 'select' ? (
        <select className={`${cls} bg-brand-panel`} value={value} onChange={(e) => onChange(e.target.value)}>
          {(f.options ?? []).map((o, i) => (
            <option key={o} value={o}>
              {f.labels?.[i] ?? o ?? '(pilih)'}
            </option>
          ))}
        </select>
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <p className="mt-1 text-xs text-brand-muted">{f.hint}</p>}
    </div>
  );
}
