// Skema intake brand (mirror prototype content-engine.html).
// `name` & `category` disimpan sebagai kolom Brand; sisanya masuk Brand.profile (JSON).

// Kategori/vertikal brand yang didukung.
export type Category = 'skincare' | 'fnb' | 'fashion' | 'service' | 'other';

// Satu produk/SKU milik brand (mis. sabun, skincare, parfum).
// Disimpan sebagai array di Brand.profile.skus.
export type Sku = {
  name: string; // wajib (mis. "Sabun Beras")
  category?: string; // jenis produk (mis. "Sabun", "Skincare", "Parfum")
  price?: string; // harga / range harga
  notes?: string; // catatan singkat (varian, kandungan, dll)
};

// Definisi satu field pada form intake brand.
export type IntakeField = {
  id: string;
  label: string;
  type?: 'text' | 'textarea' | 'select';
  hint?: string;
  options?: string[];
  labels?: string[]; // label tampilan untuk options (opsional)
};

// Satu bagian (section) form intake berisi kumpulan field.
export type IntakeSection = {
  title: string;
  vertical?: Category; // hanya muncul untuk kategori ini
  fields: IntakeField[];
};

// Opsi kategori untuk dropdown pemilihan vertikal brand.
export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'skincare', label: 'Skincare/Beauty' },
  { value: 'fnb', label: 'F&B/Resto' },
  { value: 'fashion', label: 'Fashion/Retail' },
  { value: 'service', label: 'Jasa/Service' },
  { value: 'other', label: 'Lainnya' },
];

// Field yang bukan bagian Brand.profile (dipetakan ke kolom Brand).
export const CORE_FIELDS = new Set(['name', 'category']);

// Struktur lengkap form intake brand; dirender section demi section oleh BrandEditor.
export const INTAKE_SCHEMA: IntakeSection[] = [
  // Identitas brand: nama, kategori, area, akun sosial, username IG.
  {
    title: 'Identitas brand',
    fields: [
      { id: 'name', label: 'Nama brand', type: 'text' },
      { id: 'category', label: 'Kategori', type: 'select', options: ['skincare', 'fnb', 'fashion', 'service', 'other'], labels: ['Skincare/Beauty', 'F&B/Resto', 'Fashion/Retail', 'Jasa/Service', 'Lainnya'] },
      { id: 'area', label: 'Area / pasar', type: 'text' },
      { id: 'ig_handle', label: 'Nama / username Instagram', type: 'text', hint: 'mis. @brandkamu — dipakai agar konten selaras dengan akun IG' },
      { id: 'social', label: 'Akun sosial lain (TikTok/dll)', type: 'text' },
    ],
  },
  // Brand guideline: aturan visual & konten agar hasil (mis. carousel) konsisten.
  {
    title: 'Brand guideline',
    fields: [
      { id: 'brand_colors', label: 'Palet warna brand', type: 'text', hint: 'mis. #00E5FF, pastel pink, emas' },
      { id: 'visual_style', label: 'Gaya visual', type: 'text', hint: 'font, layout, mood, referensi look' },
      { id: 'guidelines', label: 'Brand guideline (aturan visual & konten)', type: 'textarea', hint: "do & don't, elemen wajib/larangan, tone visual, aturan logo" },
    ],
  },
  // Produk/jasa: penawaran unggulan, harga, masalah yang diselesaikan, USP.
  {
    title: 'Produk / jasa',
    fields: [
      { id: 'products', label: 'Produk/jasa unggulan', type: 'textarea' },
      { id: 'price', label: 'Range harga', type: 'text' },
      { id: 'problem', label: 'Masalah pelanggan yang diselesaikan', type: 'textarea' },
      { id: 'usp', label: 'USP / pembeda utama', type: 'textarea' },
      { id: 'proof', label: 'Bukti/keunggulan konkret', type: 'textarea' },
    ],
  },
  // Target audience: profil pembeli, pain point, dan keinginan mereka.
  {
    title: 'Target audience',
    fields: [
      { id: 'buyer', label: 'Pembeli utama (umur, gender, status)', type: 'textarea' },
      { id: 'painpoint', label: 'Pain point / kekhawatiran', type: 'textarea' },
      { id: 'desire', label: 'Keinginan / aspirasi', type: 'textarea' },
    ],
  },
  // Brand voice & tone: nada, sapaan, frasa signature/terlarang, gaya emoji.
  {
    title: 'Brand voice & tone',
    fields: [
      { id: 'tone', label: 'Nada brand', type: 'select', options: ['', 'Edukatif', 'Santai/Friendly', 'Lucu/Relatable', 'Premium/Elegan', 'Tegas/Bold', 'Hangat/Caring'] },
      { id: 'sapaan', label: 'Sapaan ke audiens', type: 'text', hint: 'kamu / kak / bestie / gais / Anda' },
      { id: 'signature', label: 'Frasa signature (wajib dipakai)', type: 'textarea' },
      { id: 'forbidden', label: 'Frasa / kata TERLARANG', type: 'textarea' },
      { id: 'emoji', label: 'Penggunaan emoji', type: 'select', options: ['', 'banyak', 'secukupnya', 'none'] },
    ],
  },
  // Tujuan & CTA: sasaran konten, ajakan bertindak, promo berjalan.
  {
    title: 'Tujuan & CTA',
    fields: [
      { id: 'goal', label: 'Tujuan utama konten', type: 'select', options: ['', 'Awareness', 'Engagement', 'Jualan/Konversi', 'Edukasi'] },
      { id: 'cta', label: 'CTA / aksi yang diinginkan', type: 'textarea' },
      { id: 'promo', label: 'Promo yang sedang jalan', type: 'textarea' },
    ],
  },
  // Compliance: klaim yang dilarang & sertifikasi yang boleh disebut.
  {
    title: 'Compliance',
    fields: [
      { id: 'forbiddenClaims', label: 'Klaim yang TIDAK BOLEH dipakai', type: 'textarea' },
      { id: 'certifications', label: 'Sertifikasi yang boleh disebut', type: 'textarea', hint: 'BPOM, Halal MUI' },
    ],
  },
  // Modul khusus skincare (hanya tampil untuk kategori skincare).
  {
    title: 'Modul skincare',
    vertical: 'skincare',
    fields: [
      { id: 'sk_ingredients', label: 'Kandungan unggulan & manfaat', type: 'textarea' },
      { id: 'sk_bpom', label: 'Status izin / no. BPOM', type: 'text' },
    ],
  },
  // Modul khusus F&B (hanya tampil untuk kategori fnb).
  {
    title: 'Modul F&B',
    vertical: 'fnb',
    fields: [
      { id: 'fb_menu', label: 'Menu andalan + harga', type: 'textarea' },
      { id: 'fb_channels', label: 'Channel order', type: 'text', hint: 'GoFood/GrabFood/ShopeeFood/WA/dine-in' },
      { id: 'fb_location', label: 'Lokasi/cabang + jam', type: 'text' },
      { id: 'fb_halal', label: 'Status halal / alergen', type: 'textarea' },
    ],
  },
];
