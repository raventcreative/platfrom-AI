'use strict';
/* ═══════════════════════ UTIL & STORAGE ═══════════════════════ */
const $ = s => document.querySelector(s);
const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n[k] = v;
    else if (k in n) { try { n[k] = v; } catch (e) { n.setAttribute(k, v); } }
    else n.setAttribute(k, v);
  }
  for (const c of (Array.isArray(kids) ? kids : [kids])) if (c != null) n.append(c);
  return n;
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Penyimpanan browser diblokir'); } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2000); }
function copyText(text, label) {
  const done = () => toast((label || 'Teks') + ' disalin ✓');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.append(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Gagal menyalin — blok manual ya'); }
  ta.remove();
}
// PRNG seeded — biar tombol "versi lain" beneran ngasih variasi yang bisa diulang
function mulberry(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () {
    h |= 0; h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function pickN(rng, arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, Math.min(n, a.length));
}
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* storage brand */
const loadClients = () => store.get('ce3_clients', []);
const saveClients = l => store.set('ce3_clients', l);
const getClient = id => loadClients().find(c => c.id === id);
function saveClient(c) { const l = loadClients(); const i = l.findIndex(x => x.id === c.id); if (i >= 0) l[i] = c; else l.push(c); saveClients(l); }
function deleteClient(id) { saveClients(loadClients().filter(c => c.id !== id)); store.del('ce3_hist_' + id); store.del('ce3_seed_' + id); }
// migrasi dari versi lama (ce_clients) — sekali jalan
(function migrate() {
  if (loadClients().length) return;
  const old = store.get('ce_clients', []);
  if (Array.isArray(old) && old.length) saveClients(old.map(c => ({ ...c })));
})();

/* ═══════════════════════ DATA: KATEGORI, TONE & BANK KONTEN ═══════════════════════ */
const CATS = [
  { id: 'skincare', e: '🧴', label: 'Skincare & Beauty' },
  { id: 'fnb', e: '🍜', label: 'Makanan & Minuman' },
  { id: 'fashion', e: '👗', label: 'Fashion & Aksesoris' },
  { id: 'service', e: '🛠️', label: 'Jasa & Service' },
  { id: 'edu', e: '📚', label: 'Edukasi & Kursus' },
  { id: 'other', e: '📦', label: 'Lainnya' },
];
const catOf = c => CATS.find(x => x.id === (c.category || 'other')) || CATS[5];

// Tone → "bumbu bahasa" yang dipakai semua generator
const TONES = {
  'Santai & friendly': { closers: ['ya', 'nih', 'deh', 'kok'], boost: ['banget', 'beneran'], vibe: 'santai' },
  'Lucu & relatable': { closers: ['wkwk', 'kan', 'sih', 'loh'], boost: ['parah', 'banget'], vibe: 'lucu' },
  'Edukatif & jelas': { closers: ['ya', ''], boost: ['jauh lebih', 'terbukti'], vibe: 'edu' },
  'Premium & elegan': { closers: ['', ''], boost: ['jauh lebih', 'sungguh'], vibe: 'premium' },
  'Tegas & bold': { closers: ['. Titik', '', 'sekarang'], boost: ['jauh', 'langsung'], vibe: 'bold' },
  'Hangat & caring': { closers: ['ya', 'pelan-pelan aja'], boost: ['lebih', 'makin'], vibe: 'hangat' },
};
const TONE_LIST = Object.keys(TONES);
// tone bisa multi-pilih (array) atau string lama — normalkan jadi array valid
function toneList(c) {
  const raw = Array.isArray(c.tone) ? c.tone : (c.tone ? [c.tone] : []);
  const valid = raw.filter(t => TONES[t]);
  return valid.length ? valid : ['Santai & friendly'];
}
// gabung "bumbu bahasa" dari beberapa tone jadi satu profil
function mergeTones(names) {
  const ts = names.map(n => TONES[n]).filter(Boolean);
  const uniq = arr => [...new Set(arr)];
  return {
    vibe: ts[0].vibe, // vibe utama (buat saran sound) = tone pertama
    closers: uniq(ts.flatMap(t => t.closers)),
    boost: uniq(ts.flatMap(t => t.boost)),
  };
}
const SAPAANS = ['kak', 'kamu', 'bestie', 'gais', 'bund', 'Anda'];
const GOALS = ['Jualan', 'Biar dikenal', 'Interaksi', 'Edukasi'];
const CTAS = ['Checkout link di bio', 'Komen keyword, nanti di-DM', 'DM langsung aja', 'Order via GoFood/GrabFood', 'Datang ke toko/outlet', 'Save & share ke temanmu'];
const EMOJIS = ['secukupnya', 'banyak', 'tanpa emoji'];

/*
 * BANK per kategori — bahan mentah yang dirakit generator.
 * t = judul pendek (slide/beat), d = penjelasan 1-2 kalimat.
 */
const BANK = {
  skincare: {
    tags: ['skincarepemula', 'tipsskincare', 'skincarelokal', 'kulitsehat', 'glowingskin', 'skincareroutine', 'perawatanwajah', 'racunskincare'],
    visuals: ['close-up tekstur produk di punggung tangan', 'tetesan serum slow-mo', 'wajah depan cermin dengan cahaya jendela', 'deretan produk di meja rias estetik', 'proses tap-tap serum ke pipi', 'busa cleanser di telapak tangan'],
    props: ['produk andalan', 'cermin', 'handuk kecil', 'tripod HP'],
    mistakes: [
      { t: 'Urutan pakainya kebalik', d: 'Serum itu setelah toner dan sebelum pelembap. Kebalik = nggak meresap maksimal.' },
      { t: 'Kebanyakan produk sekaligus', d: 'Kulit butuh adaptasi. Mulai dari 3 langkah dasar dulu: cleanser, pelembap, sunscreen.' },
      { t: 'Skip sunscreen pas di rumah', d: 'Sinar UVA tembus jendela. Sunscreen tetap wajib walau nggak keluar rumah.' },
      { t: 'Ganti produk tiap minggu', d: 'Hasil skincare butuh 4–8 minggu. Gonta-ganti bikin kulit nggak pernah sempat membaik.' },
      { t: 'Nggak pernah patch test', d: 'Coba dulu 24 jam di belakang telinga sebelum dipakai ke seluruh wajah.' },
      { t: 'Cuci muka pakai air panas', d: 'Air panas bikin kulit makin kering. Pakai air suhu ruang atau hangat kuku.' },
    ],
    signs: [
      { t: 'Kusam walau rajin cuci muka', d: 'Sel kulit mati numpuk — butuh eksfoliasi lembut 1–2x seminggu.' },
      { t: 'Kering & ketarik habis mandi', d: 'Skin barrier lagi lemah. Pakai pelembap maksimal 60 detik setelah cuci muka.' },
      { t: 'Makeup gampang crack', d: 'Tanda kulit dehidrasi. Hidrasi dulu, makeup kemudian.' },
      { t: 'Perih tiap coba produk baru', d: 'Kulitmu tipe sensitif — pilih formula gentle dan selalu patch test.' },
      { t: 'Bekas jerawat lama banget pudar', d: 'Regenerasi kulit lagi lambat — bantu dengan niacinamide dan sunscreen tiap hari.' },
    ],
    myths: [
      { m: 'Makin perih makin ampuh', f: 'Perih itu tanda skin barrier protes. Kulit sehat justru butuh formula yang lembut.' },
      { m: 'Kulit berminyak nggak perlu pelembap', f: 'Kulit yang dehidrasi malah memproduksi minyak lebih banyak. Pakai pelembap ringan.' },
      { m: 'Harga mahal = pasti cocok', f: 'Cocok-cocokan itu soal kandungan dan tipe kulit, bukan harga.' },
      { m: 'Hasil kelihatan dalam 3 hari', f: 'Siklus regenerasi kulit itu ±28 hari. Yang jujur bilang 4–8 minggu.' },
      { m: 'SPF di makeup udah cukup', f: 'Jumlah yang dipakai jauh di bawah takaran uji. Tetap butuh sunscreen tersendiri.' },
    ],
    tips: [
      { t: 'Aturan 60 detik', d: 'Pelembap paling efektif dipakai maksimal 60 detik setelah cuci muka, saat kulit masih lembap.' },
      { t: '2–3 tetes serum aja', d: 'Lebih banyak bukan lebih ampuh — sisanya kebuang. Tap pelan sampai meresap.' },
      { t: 'Sunscreen takaran 2 jari', d: 'Sepanjang telunjuk + jari tengah untuk wajah dan leher. Kurang dari itu, proteksinya turun drastis.' },
      { t: 'Satu produk aktif dulu', d: 'Jangan tumpuk exfoliant + retinol + vitamin C sekaligus. Kenalan satu-satu.' },
      { t: 'Double cleansing kalau pakai sunscreen', d: 'First cleanser angkat minyak & sunscreen, second cleanser bersihkan sisanya.' },
      { t: 'Foto progress tiap minggu', d: 'Perubahan kulit itu pelan — foto dengan cahaya sama biar kelihatan bedanya.' },
    ],
    topics: ['Urutan skincare yang benar', 'Mitos skincare yang bikin boros', 'Kandungan andalan produk kita', 'Rutinitas pagi 3 langkah', 'Cara pilih produk buat pemula', 'Promo bundling minggu ini'],
    buyers: ['Cewek 18–28, pemula skincare', 'Ibu muda 25–35 yang sibuk', 'Cowok yang baru mulai skincare', 'Remaja dengan kulit berjerawat'],
    pains: ['Kulit kusam padahal udah rajin cuci muka', 'Bekas jerawat susah pudar', 'Takut produk abal-abal / merkuri', 'Bingung urutan & pilih produk', 'Kulit sensitif gampang breakout'],
    desires: ['Tampil pede tanpa makeup tebal', 'Kulit sehat glowing natural', 'Rutinitas simpel yang konsisten'],
    usps: ['Ber-BPOM & ramah pemula', 'Formula ringan non-comedogenic', 'Harga terjangkau kualitas premium'],
    forbiddenDefault: 'menyembuhkan, memutihkan permanen, 100% ampuh, tanpa efek samping',
    certDefault: 'BPOM',
    niche: 'skincare & kulit sehat',
  },
  fnb: {
    tags: ['kulinerlokal', 'jajananviral', 'makananenak', 'reviewmakanan', 'foodiegram', 'idejajan', 'kulineran', 'menuandalan'],
    visuals: ['steam mengepul dari mangkok panas', 'close-up tarikan keju / kuah disiram', 'suasana outlet ramai', 'proses masak di dapur', 'tangan nyocol saus slow-mo', 'reaksi first bite pelanggan'],
    props: ['menu andalan', 'meja bersih', 'ring light', 'tripod HP'],
    mistakes: [
      { t: 'Datang pas jam ramai', d: 'Jam 12–13 dan 19–20 paling padat. Datang di luar itu = nggak antre, makanan lebih cepat.' },
      { t: 'Langsung pesan level tertinggi', d: 'Naik bertahap — lidah butuh kenalan dulu biar tetap bisa nikmatin rasanya.' },
      { t: 'Nggak cek menu paket', d: 'Paket/bundling hampir selalu lebih hemat daripada pesan satuan.' },
      { t: 'Take away tanpa tips reheat', d: 'Panaskan terpisah kuah dan isian biar teksturnya balik seperti baru.' },
      { t: 'Skip menu hidden gem', d: 'Menu paling laris belum tentu paling enak — yang jarang disorot sering jadi favorit pelanggan setia.' },
    ],
    signs: [
      { t: 'Butuh comfort food hari ini', d: 'Habis hari yang panjang, kamu berhak makan enak tanpa mikir.' },
      { t: 'Bosen menu itu-itu aja', d: 'Waktunya coba rasa baru — mulai dari yang paling direkomendasiin.' },
      { t: 'Nyari tempat nongkrong baru', d: 'Yang nyaman buat lama-lama, harga tetap ramah.' },
      { t: 'Laper tengah malam', d: 'Cek jam buka kami — bisa jadi penyelamat kamu.' },
      { t: 'Pengen traktir tanpa boncos', d: 'Ada paket berdua yang harganya masuk akal.' },
    ],
    myths: [
      { m: 'Makanan enak pasti mahal', f: 'Rasa itu soal resep dan bahan yang diracik benar, bukan soal harga.' },
      { m: 'Pedas cuma nyiksa doang', f: 'Pedas yang pas justru mengangkat rasa — makanya ada level, biar semua kebagian.' },
      { m: 'Take away pasti kalah enak', f: 'Dengan packing yang benar dan tips reheat, rasanya nyaris sama.' },
      { m: 'Tempat rame = cuma hype', f: 'Rame yang bertahan berbulan-bulan itu bukan hype, itu rasa yang konsisten.' },
    ],
    tips: [
      { t: 'Pesan di jam sepi', d: 'Sebelum jam 12 atau setelah jam 8 malam — antrean pendek, pesanan lebih cepat.' },
      { t: 'Kombinasi menu paling pas', d: 'Yang gurih-pedas paling cocok ditemani yang manis-dingin. Percaya deh.' },
      { t: 'Reheat yang benar', d: 'Pisahkan kuah, panaskan bertahap. Microwave 30 detik lebih baik daripada 2 menit sekaligus.' },
      { t: 'Order bareng lebih hemat', d: 'Gabung pesanan dengan teman — hemat ongkir, bisa ambil paket.' },
      { t: 'Cek promo hari tertentu', d: 'Banyak promo muncul di hari kerja pas sepi — follow biar nggak kelewat.' },
    ],
    topics: ['Menu baru / menu andalan', 'Behind the scene dapur kami', 'Cara order biar hemat', 'Promo opening / diskon', 'Review jujur pelanggan', 'Level pedas mana kamu?'],
    buyers: ['Anak sekolah & mahasiswa', 'Pekerja kantoran 22–35', 'Keluarga muda', 'Anak nongkrong 16–25'],
    pains: ['Budget tipis tapi pengen makan enak', 'Bosen menu yang itu-itu aja', 'Susah cari tempat nongkrong nyaman', 'Takut zonk coba tempat baru'],
    desires: ['Makan enak tanpa bikin dompet nangis', 'Tempat nongkrong yang instagramable', 'Jajanan yang bikin nagih'],
    usps: ['Harga ramah pelajar', 'Resep otentik turun-temurun', 'Porsi besar rasa konsisten'],
    forbiddenDefault: 'menyehatkan, menyembuhkan, bikin kurus/diet',
    certDefault: 'Halal',
    niche: 'makan enak',
  },
  fashion: {
    tags: ['ootdindo', 'fashionlokal', 'mixandmatch', 'outfitinspo', 'lokalbrand', 'stylingtips', 'ootdhijab', 'fashionmurah'],
    visuals: ['transisi ganti outfit (whip pan)', 'detail jahitan & bahan close-up', 'mirror selfie OOTD', 'flat lay outfit di kasur', 'jalan ke arah kamera low angle', 'before-after styling'],
    props: ['3 outfit siap ganti', 'cermin besar', 'gantungan baju', 'tripod HP'],
    mistakes: [
      { t: 'Beli karena lucu, bukan karena cocok', d: 'Cek dulu: bisa dipadukan dengan minimal 3 item yang sudah kamu punya?' },
      { t: 'Ukuran nanggung biar "motivasi"', d: 'Pakaian yang pas hari ini selalu lebih enak dilihat daripada yang muat nanti.' },
      { t: 'Nyuci semua bahan dengan cara sama', d: 'Satin, rajut, dan linen punya perlakuan beda. Salah cuci = umur pendek.' },
      { t: 'Warna rame semua di satu outfit', d: 'Aturan aman: maksimal 3 warna, salah satunya netral.' },
      { t: 'Ngikutin tren tapi nggak nyaman', d: 'Gaya terbaik itu yang bikin kamu jalan lebih pede, bukan yang lagi viral doang.' },
    ],
    signs: [
      { t: 'Lemari penuh tapi "nggak ada baju"', d: 'Tandanya kamu butuh basic yang gampang di-mix, bukan baju baru yang ramai.' },
      { t: 'Outfit sama tiap minggu', d: 'Satu-dua statement piece bisa bikin rotasi lamamu terasa baru.' },
      { t: 'Bingung tiap ada acara', d: 'Punya 1 outfit andalan per jenis acara itu menyelamatkan hidup.' },
      { t: 'Baju cepat melar / pudar', d: 'Kualitas bahan menentukan — murah yang cepat rusak itu sebenarnya mahal.' },
    ],
    myths: [
      { m: 'Fashionable harus branded', f: 'Styling yang benar mengalahkan logo. Brand lokal sekarang kualitasnya serius.' },
      { m: 'Warna gelap selalu aman', f: 'Aman iya, tapi warna earth tone yang tepat bikin kulitmu lebih hidup.' },
      { m: 'Badan tertentu nggak cocok gaya tertentu', f: 'Bukan nggak cocok — cuma belum ketemu cutting yang tepat.' },
      { m: 'Baju bagus pasti nggak nyaman', f: 'Bahan yang benar bisa dua-duanya. Nyaman itu bagian dari desain.' },
    ],
    tips: [
      { t: 'Rumus 3 warna', d: 'Dua netral + satu aksen. Langsung kelihatan niat tanpa berlebihan.' },
      { t: 'Capsule wardrobe 10 item', d: 'Sepuluh basic yang saling nyambung = 30+ kombinasi outfit.' },
      { t: 'Setrika uap untuk bahan halus', d: 'Satin dan rajut jangan kena setrika langsung — pakai uap atau lapisi kain.' },
      { t: 'Proporsi atas-bawah', d: 'Atasan longgar, bawahan rapi — atau sebaliknya. Jangan longgar dua-duanya.' },
      { t: 'Aksesori sebagai penutup', d: 'Outfit simpel + 1 aksesori tepat > outfit ramai tanpa arah.' },
    ],
    topics: ['Mix & match 1 item jadi 3 gaya', 'Koleksi/drop terbaru', 'Tips rawat bahan', 'OOTD sesuai acara', 'Promo & restock', 'Behind the scene produksi'],
    buyers: ['Cewek 18–30 suka OOTD', 'Hijabers yang cari gaya simpel', 'Cowok streetwear 17–27', 'Wanita kantoran 25–35'],
    pains: ['Bingung mix & match', 'Baju online sering zonk (bahan/ukuran)', 'Pengen gaya bagus budget terbatas', 'Susah cari ukuran yang pas'],
    desires: ['Tampil beda tanpa ribet', 'Outfit nyaman dipakai seharian', 'Gaya konsisten yang "gue banget"'],
    usps: ['Bahan premium harga lokal', 'Size inclusive S–XXL', 'Desain limited tiap drop'],
    forbiddenDefault: 'bikin langsing, anti melar selamanya',
    niche: 'outfit & gaya',
    certDefault: '',
  },
  service: {
    tags: ['jasaprofesional', 'umkmindonesia', 'solusipraktis', 'tipsrumah', 'jasaterpercaya', 'layananrumah', 'servismurah', 'infobermanfaat'],
    visuals: ['before-after hasil pengerjaan', 'proses kerja time-lapse', 'close-up alat & tangan bekerja', 'testimoni pelanggan on-camera', 'tim menyapa kamera di lokasi', 'checklist di clipboard'],
    props: ['alat kerja utama', 'seragam/atribut tim', 'hasil kerja yang rapi'],
    mistakes: [
      { t: 'Nunggu rusak parah baru panggil', d: 'Perawatan rutin selalu lebih murah daripada perbaikan besar. Selalu.' },
      { t: 'Pilih yang termurah tanpa cek ulasan', d: 'Murah tapi dua kali kerja = lebih mahal. Cek portofolio & ulasan dulu.' },
      { t: 'Nggak nanya garansi', d: 'Jasa yang berani kasih garansi = yakin sama kualitas kerjanya.' },
      { t: 'DIY untuk hal berisiko', d: 'Beberapa hal boleh coba sendiri. Sisanya lebih aman (dan hemat) diserahkan ahlinya.' },
      { t: 'Nggak minta rincian harga di awal', d: 'Rincian tertulis di awal menghindari biaya siluman di akhir.' },
    ],
    signs: [
      { t: 'Sudah lebih dari 6 bulan nggak diservis', d: 'Performa turun pelan-pelan itu sering nggak kerasa — sampai tiba-tiba rusak.' },
      { t: 'Ada suara / bau / tanda aneh', d: 'Tanda kecil hari ini = kerusakan besar bulan depan kalau didiamkan.' },
      { t: 'Tagihan naik tanpa sebab jelas', d: 'Alat yang nggak efisien diam-diam boros. Servis bisa balikin efisiensinya.' },
      { t: 'Udah coba benerin sendiri, tetap balik lagi', d: 'Kalau masalah berulang, akar masalahnya belum ketemu.' },
    ],
    myths: [
      { m: 'Servis rutin cuma buang uang', f: 'Data bilang sebaliknya: perawatan rutin memperpanjang umur alat 2–3x lipat.' },
      { m: 'Semua tukang sama saja', f: 'Beda pengalaman, beda alat, beda garansi. Hasilnya kelihatan setelah 3 bulan.' },
      { m: 'Harga murah pasti untung', f: 'Kalau harus panggil dua kali, yang murah jadi yang paling mahal.' },
      { m: 'Bisa ditunda, masih jalan kok', f: 'Menunda itu bunga pinjaman — makin lama, makin mahal bayarnya.' },
    ],
    tips: [
      { t: 'Jadwalkan sebelum musim ramai', d: 'Order di masa sepi = lebih cepat dilayani, kadang dapat harga lebih baik.' },
      { t: 'Foto kondisi sebelum & sesudah', d: 'Dokumentasi bikin kamu tahu persis apa yang dikerjakan.' },
      { t: 'Tanya estimasi umur & perawatan', d: 'Teknisi yang baik ninggalin ilmu, bukan cuma hasil kerja.' },
      { t: 'Simpan kontak yang terbukti bagus', d: 'Vendor langganan yang paham riwayat alatmu = kerja lebih cepat & tepat.' },
    ],
    topics: ['Before-after project terbaru', 'Tanda kamu butuh jasa kami', 'Tips perawatan sendiri di rumah', 'Kenapa harga kami segini (transparansi)', 'Testimoni pelanggan', 'Promo musiman'],
    buyers: ['Pemilik rumah 28–45', 'Anak kos / perantau', 'Pemilik usaha kecil', 'Keluarga sibuk yang butuh praktis'],
    pains: ['Takut kena harga tembak', 'Susah cari yang bisa dipercaya', 'Nggak sempat urus sendiri', 'Pernah kecewa hasil asal-asalan'],
    desires: ['Beres tanpa drama', 'Harga jelas di awal', 'Hasil rapi & bergaransi'],
    usps: ['Garansi tertulis', 'Harga transparan di awal', 'Tim berpengalaman & bersertifikat'],
    forbiddenDefault: 'pasti 100%, termurah se-Indonesia',
    niche: 'perawatan & servis',
    certDefault: '',
  },
  edu: {
    tags: ['belajarbareng', 'tipsbelajar', 'upgradeskill', 'kelasonline', 'produktivitas', 'karirimpian', 'selfdevelopment', 'infobeasiswa'],
    visuals: ['close-up tangan nulis / ngetik', 'layar materi dengan highlight', 'talking head + poin muncul di layar', 'time-lapse belajar', 'testimoni murid on-camera', 'before-after hasil karya murid'],
    props: ['laptop/buku', 'papan tulis kecil', 'materi contoh'],
    mistakes: [
      { t: 'Nonton materi doang tanpa praktik', d: 'Ilmu nempel karena dipakai. Rasio idealnya 30% belajar, 70% praktik.' },
      { t: 'Belajar maraton semalaman', d: 'Otak menyimpan lewat pengulangan singkat — 25 menit fokus lebih ampuh dari 4 jam begadang.' },
      { t: 'Ngoleksi kelas tapi nggak diselesaikan', d: 'Satu kelas selesai + dipraktikkan > lima kelas setengah jalan.' },
      { t: 'Nggak punya target spesifik', d: '"Pengen bisa" itu bukan target. "Bikin 1 portofolio dalam 30 hari" — itu target.' },
      { t: 'Belajar sendirian terus', d: 'Komunitas & mentor memangkas trial-error bertahun-tahun jadi hitungan bulan.' },
    ],
    signs: [
      { t: 'Skill kamu mulai ketinggalan di kerjaan', d: 'Industri gerak cepat — yang berhenti belajar pelan-pelan tergeser.' },
      { t: 'Gaji stuck padahal kerja makin banyak', d: 'Kadang bukan kurang kerja keras, tapi kurang skill yang dibayar mahal.' },
      { t: 'Scroll tutorial tapi nggak pernah mulai', d: 'Kamu nggak butuh info lagi — kamu butuh struktur dan deadline.' },
      { t: 'Pengen pindah karir tapi bingung mulai', d: 'Roadmap yang jelas mengubah "suatu saat" jadi "bulan ini".' },
    ],
    myths: [
      { m: 'Udah telat buat belajar skill baru', f: 'Rata-rata orang ganti arah karir 3–5 kali seumur hidup. Telat itu mitos.' },
      { m: 'Harus bakat dulu baru bisa', f: 'Bakat cuma mempercepat awal. Konsistensi yang menentukan hasil akhirnya.' },
      { m: 'Belajar online nggak seefektif offline', f: 'Efektif itu soal kurikulum + praktik + feedback, bukan lokasinya.' },
      { m: 'Sertifikat = jaminan kerja', f: 'Portofolio hasil praktik jauh lebih dilirik daripada selembar sertifikat.' },
    ],
    tips: [
      { t: 'Teknik 25 menit (pomodoro)', d: 'Fokus 25 menit, istirahat 5. Empat putaran sehari > belajar maraton seminggu sekali.' },
      { t: 'Belajar buat diajarkan', d: 'Jelaskan ulang materi ke orang lain (atau kamera) — cara tercepat menguji paham.' },
      { t: 'Rakit portofolio sejak hari 1', d: 'Setiap latihan = calon isi portofolio. Jangan tunggu "udah jago".' },
      { t: 'Cari teman seperjuangan', d: 'Akuntabilitas publik bikin kamu 65% lebih mungkin konsisten.' },
      { t: 'Review mingguan 15 menit', d: 'Tiap minggu: apa yang nempel, apa yang belum, minggu depan fokus apa.' },
    ],
    topics: ['Tips belajar efektif', 'Cerita sukses murid', 'Isi kurikulum & cara daftar', 'Mitos belajar yang menghambat', 'Promo batch baru', 'Skill yang lagi dicari industri'],
    buyers: ['Mahasiswa & fresh graduate', 'Karyawan yang mau naik level', 'Job seeker pindah karir', 'Ibu rumah tangga cari cuan online'],
    pains: ['Bingung mulai belajar dari mana', 'Nggak konsisten, gampang nyerah', 'Takut ilmunya nggak kepakai', 'Budget kursus terbatas'],
    desires: ['Punya skill yang dibayar mahal', 'Karir naik / pindah bidang', 'Bisa cuan dari rumah'],
    usps: ['Mentor praktisi aktif', 'Kurikulum berbasis praktik & portofolio', 'Komunitas alumni yang aktif'],
    forbiddenDefault: 'pasti langsung kerja, dijamin gaji 2 digit',
    niche: 'belajar skill baru',
    certDefault: '',
  },
  other: {
    tags: ['umkmindonesia', 'produklokal', 'bisnislokal', 'supportlokal', 'infoproduk', 'rekomendasiproduk', 'belanjahemat', 'usahakecil'],
    visuals: ['unboxing produk', 'proses produksi behind the scene', 'produk dipakai di kehidupan nyata', 'before-after pakai produk', 'testimoni pelanggan', 'packing pesanan time-lapse'],
    props: ['produk andalan', 'meja bersih', 'packaging'],
    mistakes: [
      { t: 'Beli tanpa cek kebutuhan asli', d: 'Tanya dulu: masalah apa yang mau diselesaikan? Itu yang menentukan pilihan.' },
      { t: 'Tergiur murah, lupa cek kualitas', d: 'Barang murah yang cepat rusak sebenarnya lebih mahal dari yang awet.' },
      { t: 'Nggak baca cara pakai/rawat', d: 'Umur produk sering ditentukan cara pakainya, bukan kualitasnya.' },
      { t: 'Skip ulasan pembeli lain', d: 'Ulasan bintang 3 sering lebih jujur daripada bintang 5 — baca yang itu.' },
      { t: 'Nunda beli pas lagi promo', d: 'Kalau memang dibutuhkan, promo adalah waktu terbaik. Nunda = beli mahal nanti.' },
    ],
    signs: [
      { t: 'Yang lama udah nggak optimal', d: 'Kalau lebih sering ngerepotin daripada membantu, itu tanda waktunya ganti.' },
      { t: 'Sering pinjam punya orang', d: 'Kalau kamu terus meminjam benda yang sama, kamu sebenarnya membutuhkannya.' },
      { t: 'Waktu kebuang buat hal kecil', d: 'Alat yang tepat mengembalikan waktumu — dan waktu itu nggak bisa dibeli.' },
      { t: 'Budget ada, tapi ragu terus', d: 'Riset secukupnya, lalu putuskan. Ragu berkepanjangan juga ada biayanya.' },
    ],
    myths: [
      { m: 'Produk lokal kalah kualitas', f: 'Banyak produk lokal sekarang setara impor — bedanya cuma gengsi nama.' },
      { m: 'Harga mahal pasti bagus', f: 'Harga mencerminkan banyak hal — termasuk iklan. Cek spesifikasi, bukan gengsinya.' },
      { m: 'Semua produk sejenis sama saja', f: 'Detail kecil (bahan, layanan, garansi) yang membedakan pengalaman 6 bulan ke depan.' },
      { m: 'Ulasan bagus pasti asli', f: 'Cek ulasan bintang 3 dan foto dari pembeli — di situ cerita jujurnya.' },
      { m: 'Belanja online selalu berisiko', f: 'Risiko turun drastis kalau cek 3 hal: spesifikasi, ulasan buruk, dan kebijakan retur.' },
    ],
    tips: [
      { t: 'Rumus beli: butuh > suka', d: 'Suka itu bonus. Mulai dari daftar kebutuhan, baru pilih yang paling disuka.' },
      { t: 'Cek 3 hal sebelum checkout', d: 'Bahan/spesifikasi, ulasan buruknya, dan kebijakan retur. Tiga menit yang menyelamatkan.' },
      { t: 'Rawat sesuai panduan', d: 'Produk yang dirawat benar umurnya bisa 2x lipat. Panduannya biasanya cuma 5 baris.' },
      { t: 'Manfaatkan garansi', d: 'Simpan nota & kemasan. Garansi cuma berguna kalau kamu bisa klaim.' },
    ],
    topics: ['Kenalan sama produk kami', 'Behind the scene produksi', 'Cara pakai & rawat yang benar', 'Testimoni pelanggan', 'Promo & bundling', 'Tips memilih produk sejenis'],
    buyers: ['Pembeli online 20–35', 'Keluarga muda', 'Pemburu produk lokal berkualitas'],
    pains: ['Takut zonk belanja online', 'Bingung bandingin produk sejenis', 'Budget terbatas pengen yang awet'],
    desires: ['Belanja sekali, puas lama', 'Dapat barang sesuai ekspektasi', 'Dukung produk lokal tanpa kompromi'],
    usps: ['Kualitas dicek satu-satu sebelum kirim', 'Garansi & retur mudah', 'Buatan lokal, standar ekspor'],
    forbiddenDefault: 'terbaik se-Indonesia, 100% tanpa cacat',
    niche: 'belanja pintar',
    certDefault: '',
  },
};
const bankOf = c => BANK[c.category] || BANK.other;

/* ═══════════════════════ ENGINE: FAKTA BRAND & VOICE ═══════════════════════ */
const splitList = s => String(s || '').split(/[,;\n•]+/).map(x => x.trim()).filter(x => x.length > 1);
const firstOf = (arr, d) => (arr && arr.length ? arr[0] : d);
const lower1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;

// Kumpulkan semua fakta brand jadi satu objek yang dipakai generator
function factsOf(c) {
  const bank = bankOf(c);
  const products = splitList(c.products);
  const pains = splitList(c.painpoint);
  const desires = splitList(c.desire);
  return {
    c, bank,
    name: (c.name || 'brand kamu').trim(),
    products,
    product: firstOf(products, 'produk andalan kami'),
    pains: pains.length ? pains : [firstOf(bank.pains, 'masalah yang sering kamu alami')],
    pain: firstOf(pains, lower1(firstOf(bank.pains, 'masalah yang itu-itu terus'))),
    desires: desires.length ? desires : bank.desires,
    desire: firstOf(desires, lower1(firstOf(bank.desires, 'hasil yang kamu pengen'))),
    usp: (c.usp || '').trim(),
    proof: (c.proof || '').trim(),
    price: (c.price || '').trim(),
    promo: (c.promo || '').trim(),
    area: (c.area || '').trim(),
    buyer: (c.buyer || '').trim(),
    sapaan: (c.sapaan || 'kamu').trim(),
    signature: (c.signature || '').trim(),
    cta: (c.cta || 'Save & share ke temanmu').trim(),
    goal: (c.goal || 'Interaksi').trim(),
    tone: mergeTones(toneList(c)),
    emojiPref: c.emoji || 'secukupnya',
  };
}

// Emoji sesuai preferensi brand
function emo(f, ...opts) {
  if (f.emojiPref === 'tanpa emoji') return '';
  return ' ' + (opts[0] || '✨');
}
function emoAll(f, s) { return f.emojiPref === 'tanpa emoji' ? s.replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2728}\u{2764}]/gu, '') : s; }

// Kata terlarang → pengganti aman (compliance BPOM & umum)
const SAFE_SWAPS = [
  [/\bmenyembuhkan\b/gi, 'membantu merawat'],
  [/\bmengobati\b/gi, 'membantu merawat'],
  [/\bmemutihkan\b/gi, 'membantu mencerahkan tampilan'],
  [/\bmenghilangkan\b/gi, 'membantu menyamarkan'],
  [/\b100% ampuh\b/gi, 'terasa bedanya'],
  [/\bpermanen\b/gi, 'tahan lama'],
  [/\bpaling murah\b/gi, 'ramah di kantong'],
  [/\bterbaik se-?indonesia\b/gi, 'jadi andalan banyak orang'],
  [/\btanpa efek samping\b/gi, 'formulanya lembut'],
];
function sanitize(text, f) {
  let out = text;
  for (const [re, sub] of SAFE_SWAPS) out = out.replace(re, sub);
  for (const w of splitList(f.c.forbidden).concat(splitList(f.c.forbiddenClaims))) {
    if (w.length < 3) continue;
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, '—');
  }
  return emoAll(f, out).replace(/\s+—\s*—\s*/g, ' ').replace(/ {2,}/g, ' ');
}

/* ── HASHTAG BUILDER ── */
const MEGA_TAGS = ['fyp', 'foryou', 'foryoupage', 'viral', 'trending', 'instagood', 'love', 'like4like', 'follow', 'explore', 'reels', 'tiktok', 'skincare', 'makanan', 'fashion', 'indonesia'];
function slugTag(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).slice(0, 3).join(''); }
function buildHashtags(f, topic, rng) {
  const tags = [];
  const add = t => { const s = slugTag(t); if (s && s.length > 2 && s.length < 28 && !tags.includes(s)) tags.push(s); };
  pickN(rng, f.bank.tags, 2).forEach(add);                         // niche
  if (topic) add(topic);                                           // topik hari ini
  add(f.name);                                                     // branded
  if (f.area && !/nasional|online|seluruh/i.test(f.area)) {        // lokal
    const kota = f.area.split(/[,&/]| dan /)[0].trim();
    add((f.bank.tags[0] || 'info') + kota);
  }
  while (tags.length < 4) add(pick(rng, f.bank.tags));
  return tags.slice(0, 5).map(t => '#' + t);
}

/* ── HOOK PATTERNS (dipakai script, carousel, caption, ide) ── */
const HOOKS = [
  { id: 'problem', pattern: 'Problem hook',
    make: (f, t, rng) => ({ text: `${cap1(pick(rng, f.pains))}? Ini biang sama solusinya`,
      why: 'Tembak masalah audiens di detik 0. Yang lagi ngalamin langsung berhenti scroll.' }) },
  { id: 'pov', pattern: 'POV relatable',
    make: (f, t, rng) => ({ text: `POV: ${lower1(pick(rng, f.pains))}` + emo(f, '😩'),
      why: `Nunjuk langsung masalah ${f.buyer || 'audiensmu'} — yang ngerasa pasti berhenti scroll.` }) },
  { id: 'stop', pattern: 'Warning / stop',
    make: (f, t, rng) => ({ text: `STOP ${lower1(pick(rng, f.bank.mistakes).t)} — dengerin dulu`,
      why: 'Larangan memicu rasa takut-salah. Orang nonton sampai tahu jawabannya.' }) },
  { id: 'listicle', pattern: 'Listicle berangka',
    make: (f, t, rng) => ({ text: `${pick(rng, [3, 4, 5])} hal soal ${t ? lower1(t) : lower1(f.pain)} yang jarang dibahas`,
      why: 'Angka = janji isi yang jelas. Otak penasaran sampai poin terakhir.' }) },
  { id: 'question', pattern: 'Pertanyaan langsung',
    make: (f, t, rng) => ({ text: `${cap1(pick(rng, f.pains))}? Mungkin ini sebabnya`,
      why: 'Pertanyaan yang tepat sasaran bikin otak otomatis nyari jawabannya.' }) },
  { id: 'mitos', pattern: 'Kontrarian / mitos',
    make: (f, t, rng) => { const m = pick(rng, f.bank.myths); return { text: `"${m.m}" — ini mitos, dan ini faktanya`,
      why: 'Membantah keyakinan umum memicu rasa "hah, masa sih?" — hook paling kuat buat edukasi.' }; } },
  { id: 'secret', pattern: 'Curiosity gap',
    make: (f, t, rng) => ({ text: `Rahasia ${lower1(pick(rng, f.desires))} yang jarang diomongin`,
      why: 'Ada celah info yang sengaja belum dibuka — orang bertahan buat nutup celah itu.' }) },
  { id: 'beforeafter', pattern: 'Before / after',
    make: (f, t, rng) => ({ text: `Dulu ${lower1(f.pain)}. Sekarang? Beda cerita`,
      why: 'Transformasi = bukti. Orang pengen tahu caranya.' }) },
  { id: 'callout', pattern: 'Call-out audiens',
    make: (f, t, rng) => ({ text: `Kalau ${f.sapaan === 'Anda' ? 'Anda' : 'kamu'} ${lower1(f.buyer || 'lagi ngalamin ini')}, ini buat ${f.sapaan === 'Anda' ? 'Anda' : 'kamu'}`,
      why: 'Menyebut audiens spesifik bikin yang merasa langsung merasa dipanggil.' }) },
  { id: 'relate', pattern: 'Relatable struggle',
    make: (f, t, rng) => ({ text: `Yang ${lower1(pick(rng, f.pains))}, mana suaranya` + emo(f, '🙋'),
      why: 'Validasi perasaan audiens — komen "AKU BANGET" bakal rame sendiri.' }) },
  { id: 'challenge', pattern: 'Eksperimen / challenge',
    make: (f, t, rng) => ({ text: `${pick(rng, ['Kami coba', 'Tim kami tes'])} ${t ? lower1(t) : lower1(f.product)} selama ${pick(rng, [7, 14, 30])} hari — hasilnya?`,
      why: 'Format eksperimen punya cerita + hasil. Orang nonton demi ending-nya.' }) },
  { id: 'harga', pattern: 'Angka kejut',
    make: (f, t, rng) => ({ text: f.price ? `Mulai ${f.price.split(/[–-]/)[0].trim()} bisa dapet ${lower1(f.product)}? Serius` : `${cap1(lower1(f.product))} sebagus ini, harganya nggak masuk akal`,
      why: 'Angka konkret di detik pertama memancing rasa "kok bisa?"' }) },
  { id: 'jujur', pattern: 'Kejujuran radikal',
    make: (f, t, rng) => ({ text: `Jujur: ${lower1(pick(rng, [`${f.product} ini nggak cocok buat semua orang`, 'nggak semua yang viral itu bagus', 'kami pernah salah soal ini']))}`,
      why: 'Kejujuran itu langka di feed — langsung beda dari iklan biasa & bangun trust.' }) },
  { id: 'mistake', pattern: 'Kesalahan umum',
    make: (f, t, rng) => ({ text: `Kesalahan #1 yang bikin ${lower1(pick(rng, f.pains))}`,
      why: 'Orang takut sedang melakukan kesalahan yang sama — nonton buat memastikan.' }) },
  { id: 'nobody', pattern: 'Nggak ada yang ngasih tau',
    make: (f, t, rng) => ({ text: `Nggak ada yang ngasih tau ${sapa(f)} soal ${t ? lower1(t) : lower1(f.pain)}`,
      why: 'Klaim "info rahasia" bikin audiens merasa dapat bocoran yang orang lain nggak punya.' }) },
  { id: 'timesave', pattern: 'Hemat waktu/uang',
    make: (f, t, rng) => ({ text: `Andai ${sapa(f)} tau ini dari dulu — hemat ${pick(rng, ['waktu', 'uang', 'drama'])} banget`,
      why: 'Menyentuh penyesalan "coba dari kemarin" — emosi yang bikin orang nyimak & nge-save.' }) },
  { id: 'vs', pattern: 'Ini vs itu',
    make: (f, t, rng) => ({ text: `${cap1(lower1(f.product))} vs cara lama: bedanya kerasa banget`,
      why: 'Format perbandingan gampang dicerna & bikin produkmu jadi pilihan yang jelas.' }) },
  { id: 'number', pattern: 'Statistik mengejutkan',
    make: (f, t, rng) => ({ text: `${pick(rng, ['9 dari 10', '80% orang', 'Hampir semua'])} ${lower1(f.buyer || 'orang')} salah soal ini`,
      why: 'Angka besar terasa faktual & memancing "aku termasuk yang mana?"' }) },
  { id: 'wish', pattern: 'Pengandaian',
    make: (f, t, rng) => ({ text: `Bayangin ${lower1(pick(rng, f.desires))} tanpa ${lower1(f.pain)}`,
      why: 'Ajak audiens membayangkan hasil idealnya dulu — mereka jadi pengen tahu jalannya.' }) },
  { id: 'confession', pattern: 'POV karakter',
    make: (f, t, rng) => ({ text: `POV: ${sapa(f)} akhirnya nemu ${lower1(f.product)} yang beneran cocok`,
      why: 'POV positif = fantasi yang enak dibayangin; audiens memproyeksikan diri ke situ.' }) },
  { id: 'checklist', pattern: 'Tanda / checklist',
    make: (f, t, rng) => ({ text: `${pick(rng, [3, 5])} tanda ${sapa(f)} butuh ${lower1(f.product)} (jujur aja)`,
      why: 'Checklist bikin orang mengecek diri sendiri poin demi poin sampai habis.' }) },
  { id: 'trend', pattern: 'Reaksi tren',
    make: (f, t, rng) => ({ text: `Semua ${pick(rng, ['lagi ngomongin', 'ngira'])} ${t ? lower1(t) : lower1(f.pain)} — tapi ini yang kelewat`,
      why: 'Menumpang topik yang lagi ramai lalu kasih sudut baru = relevan sekaligus segar.' }) },
];
function makeHooks(f, topic, rng, n, forceId) {
  n = n || 3;
  let picked;
  const forced = forceId ? HOOKS.find(h => h.id === forceId) : null;
  if (forced) {
    const rest = pickN(rng, HOOKS.filter(h => h.id !== forceId), Math.max(0, n - 1));
    picked = [forced, ...rest];
  } else {
    picked = pickN(rng, HOOKS, n);
  }
  return picked.map(h => { const r = h.make(f, topic, rng); return { text: sanitize(cap1(r.text), f), pattern: h.pattern, why: r.why }; });
}
// menu tipe hook buat dipilih user (label ringkas). Semua id ada di HOOKS.
const HOOK_MENU = [
  ['problem', '😣 Problem'], ['question', '❓ Pertanyaan'], ['secret', '🤫 Curiosity gap'],
  ['listicle', '🔢 Listicle'], ['mitos', '⚡ Mitos vs fakta'], ['stop', '🚫 Warning/Stop'],
  ['pov', '🎭 POV relatable'], ['beforeafter', '🔄 Before-after'], ['number', '📊 Statistik'],
  ['mistake', '⚠️ Kesalahan umum'], ['challenge', '🧪 Eksperimen'], ['harga', '💸 Angka kejut'],
  ['jujur', '🫶 Kejujuran'], ['callout', '📣 Call-out'], ['timesave', '⏳ Penyesalan'],
  ['vs', '🥊 Ini vs itu'], ['relate', '🙋 Relatable'], ['wish', '🌈 Pengandaian'],
  ['checklist', '✅ Tanda/checklist'], ['trend', '🔥 Reaksi tren'], ['nobody', '🔓 Info rahasia'],
  ['confession', '💚 POV karakter'],
];

/* ═══════════════════════ GENERATOR KONTEN ═══════════════════════ */
const SOUNDS = {
  santai: 'Audio trending tempo santai (lo-fi upbeat) — cek tab Reels trending hari ini',
  lucu: 'Sound komedi yang lagi naik (cek trending) atau voice over sendiri dengan tempo cepat',
  edu: 'Instrumental minimal volume rendah — biar voice over tetap jelas',
  premium: 'Instrumental elegan (piano/strings ringan), tanpa vokal',
  bold: 'Beat tegas dengan drop di detik 3 — pas ganti scene',
  hangat: 'Akustik hangat tempo pelan, volume di bawah voice over',
};
const sapa = f => f.sapaan === 'Anda' ? 'Anda' : f.sapaan;
const closer = (f, rng) => { const c = pick(rng, f.tone.closers); return c ? ' ' + c : ''; };
// skala durasi scene ke target total
function scaleDur(scenes, target) {
  const sum = scenes.reduce((a, s) => a + s.duration_sec, 0);
  let acc = 0;
  return scenes.map((s, i) => {
    let d = Math.max(2, Math.round(s.duration_sec * target / sum));
    if (i === scenes.length - 1) d = Math.max(2, target - acc);
    acc += d;
    return { ...s, duration_sec: d };
  });
}
const ostShort = s => { const w = String(s).replace(/["""]/g, '').split(/\s+/); return w.slice(0, 7).join(' ') + (w.length > 7 ? '…' : ''); };

function genScript(c, daily, seedN) {
  const rng = mulberry(c.id + '|script|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const target = parseInt(daily.durasi) || 30;
  const platform = daily.platform || 'IG Reels';
  const goal = daily.goal || f.goal;
  const hooks = makeHooks(f, t, rng, 3, daily.hook);
  const S = sapa(f);
  const sc = (visual, voiceover, ost, d) => ({ visual, voiceover: sanitize(voiceover, f), onscreen_text: sanitize(ost, f), duration_sec: d });
  let scenes = [], frameName = '', learning = '';
  const vis = () => pick(rng, f.bank.visuals);

  if (/jual/i.test(goal)) {
    frameName = 'PAS (Problem–Agitate–Solve)';
    const pain = pick(rng, f.pains);
    scenes = [
      sc(`Adegan masalah: ${lower1(pain)} — ekspresi capek/kesal, shot dekat`, `${cap1(pain)}? Sini ${S}, dengerin bentar.`, ostShort(pain), 3),
      sc('Ganti angle — bicara ke kamera, gestur tangan', `Udah nyoba macem-macem tapi hasilnya gitu-gitu aja${closer(f, rng)}? Masalahnya sering bukan di ${S}, tapi di pilihannya.`, 'Masalahnya bukan di kamu', 6),
      sc(`Reveal produk: ${vis()}`, `Kenalin: ${f.product}.${f.usp ? ' ' + cap1(f.usp) + '.' : ''} Dibuat khusus buat ${S} yang ${lower1(f.pain)}.`, cap1(f.product), 8),
      sc('Bukti: tunjukkan detail/testimoni/angka di layar', `${f.proof ? cap1(f.proof) + '.' : 'Yang udah nyoba, susah pindah ke lain.'}${f.price ? ' Harganya? ' + f.price + '.' : ''}`, f.proof || 'Buktinya nyata', 7),
      sc('Close-up produk + teks CTA besar, senyum ke kamera', `${f.promo ? cap1(f.promo) + ' — jangan sampai kelewat. ' : ''}${cap1(f.cta)}${closer(f, rng)}!`, ostShort(f.cta) + (f.emojiPref !== 'tanpa emoji' ? ' 👇' : ''), 6),
    ];
    learning = `Script ini pakai formula ${frameName}: buka dengan masalah audiens (bukan produk!), panasin dikit, baru tawarkan solusi + bukti + 1 CTA. Produk baru muncul di tengah — kalau muncul di awal, orang langsung skip karena kerasa iklan.`;
  } else if (/edukasi/i.test(goal)) {
    const useMyth = rng() < 0.4;
    if (useMyth) {
      frameName = 'Mitos vs Fakta';
      const [m1, m2] = pickN(rng, f.bank.myths, 2);
      scenes = [
        sc('Bicara ke kamera, ekspresi "serius tapi santai"', `Ini mitos-mitos soal ${t ? lower1(t) : lower1(catOf(c).label.toLowerCase())} yang bikin ${S} rugi. Nomor dua paling sering dipercaya.`, 'Mitos yang bikin kamu rugi', 3),
        sc(`Teks "MITOS" besar di layar → ${vis()}`, `Mitos pertama: "${m1.m}." Faktanya? ${m1.f}`, 'Mitos #1: ' + ostShort(m1.m), 9),
        sc('Pattern interrupt: ganti angle/zoom, teks "MITOS 2"', `Mitos kedua — ini yang paling banyak dipercaya: "${m2.m}." Padahal, ${lower1(m2.f)}`, 'Mitos #2: ' + ostShort(m2.m), 9),
        sc('Kembali ke wajah, nada menyimpulkan', `Intinya: jangan telan mentah-mentah apa kata orang. ${f.signature ? cap1(f.signature) + '. ' : ''}${cap1(f.cta)}${closer(f, rng)}.`, ostShort(f.cta), 6),
      ];
      learning = 'Format mitos-vs-fakta memicu reaksi "hah, masa sih?" — otak nggak nyaman sama keyakinan yang dibantah, jadi nonton sampai habis. Menyebut "nomor dua paling sering dipercaya" di awal itu open loop: janji yang bikin orang bertahan.';
    } else {
      frameName = 'Tips berangka';
      const tips = pickN(rng, f.bank.tips, 3);
      scenes = [
        sc('Bicara ke kamera / teks besar di frame menarik', `${pick(rng, [`3 hal yang harus ${S} tahu soal`, 'Simpen ini — 3 tips soal'])} ${t ? lower1(t) : lower1(f.pain)}. Langsung aja.`, '3 tips — no basa-basi', 3),
        ...tips.map((tip, i) => sc(i === 1 ? 'Pattern interrupt: pindah posisi/angle + props' : `Visual pendukung: ${vis()}`, `${['Satu', 'Dua', 'Tiga'][i]}: ${lower1(tip.t)}. ${tip.d}`, `${i + 1}. ${ostShort(tip.t)}`, 8)),
        sc('Recap cepat: 3 poin muncul berurutan di layar', `Udah, gitu aja — simpel kan${closer(f, rng)}? ${cap1(f.cta)} biar nggak lupa.`, ostShort(f.cta) + (f.emojiPref !== 'tanpa emoji' ? ' 📌' : ''), 5),
      ];
      learning = 'Struktur listicle: janji angka di detik pertama, satu ide per beat, ganti visual tiap 5–8 detik biar retensi kejaga. "No basa-basi" itu penting — 50% penonton kabur kalau value belum muncul di 3 detik pertama.';
    }
  } else if (/interaksi/i.test(goal)) {
    frameName = 'POV / relatable skit';
    const pain = pick(rng, f.pains);
    scenes = [
      sc(`Akting jadi audiens: ${lower1(pain)} — ekspresi dilebihkan dikit`, `(tanpa VO — cukup akting + sound) `, 'POV: ' + ostShort(lower1(pain)), 4),
      sc('Twist: reaksi berlebihan / plot twist kecil yang relate', `(teks di layar yang bercerita, biarkan akting yang kerja)`, pick(rng, ['Kenapa selalu gini 😭', 'Relate nggak sih', 'Tolong ini aku banget']), 8),
      sc(`Resolusi ringan: ${vis()} — brand muncul natural, bukan hard-sell`, `${pick(rng, ['Untung sekarang udah kenal', 'Sampai akhirnya nemu'])} ${f.name}${closer(f, rng)}.`, cap1(f.name) + ' to the rescue', 7),
      sc('Freeze + pertanyaan besar di layar', `Kalau ${S} tim mana: ${pick(rng, ['udah move on atau masih gini?', 'relate atau nggak?'])} Komen di bawah${closer(f, rng)}!`, 'Kamu tim mana? 👇', 5),
    ];
    learning = 'Konten interaksi menang lewat komentar. Kuncinya: validasi perasaan audiens (POV relatable), tutup dengan pertanyaan yang gampang dijawab. Brand cukup numpang lewat — kalau jualan keras, komen malah sepi.';
  } else {
    frameName = 'Story / kenalan brand';
    scenes = [
      sc('Shot produk/tempat paling menarik dulu (bukan wajah)', `${pick(rng, ['Ini cerita di balik', 'Banyak yang nanya soal'])} ${f.name} — ${pick(rng, ['dan kenapa kami mulai.', 'jadi sini kami spill.'])}`, 'Cerita di balik ' + f.name, 4),
      sc(`Behind the scene: ${vis()}`, `Semua berawal dari ${lower1(f.pain)}. Kami ngerasain sendiri — dan nggak nemu yang beneran pas.`, 'Berawal dari masalah yang sama', 8),
      sc('Proses/detail yang menunjukkan keseriusan', `Makanya ${lower1(f.product)} kami bikin beda: ${f.usp ? lower1(f.usp) : 'detailnya kami pikirin satu-satu'}.${f.proof ? ' Sekarang? ' + cap1(f.proof) + '.' : ''}`, f.usp ? cap1(f.usp) : 'Dibuat beda', 9),
      sc('Wajah tim/founder senyum, suasana hangat', `Buat ${S} yang ${lower1(f.desire)} — ${pick(rng, ['kami di sini.', 'salam kenal ya.'])} ${cap1(f.cta)}${closer(f, rng)}.`, 'Salam kenal' + emo(f, ' 🤝'), 6),
    ];
    learning = 'Konten awareness paling nempel lewat cerita, bukan daftar keunggulan. Struktur: masalah yang sama dengan audiens → kenapa kami peduli → bukti keseriusan. Orang follow brand yang punya "kenapa".';
  }

  scenes = scaleDur(scenes, target).map((s, i) => ({ scene: i + 1, ...s }));
  return {
    type: 'script', platform, duration_sec: target, frame: frameName,
    title: t ? cap1(t) : hooks[0].text,
    hooks, scenes, cta: sanitize(cap1(f.cta), f),
    sound_suggestion: SOUNDS[f.tone.vibe] || SOUNDS.santai,
    learning_note: learning,
    compliance_notes: c.category === 'skincare' ? 'Klaim dijaga aman BPOM: semua dibingkai "membantu / tampak", tanpa janji medis.' : (c.category === 'fnb' ? 'Sebutkan channel order & harga dengan jujur; tanpa klaim kesehatan.' : 'Tanpa overclaim; semua angka diambil dari profil brand.'),
  };
}

function genCarousel(c, daily, seedN) {
  const rng = mulberry(c.id + '|carousel|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const goal = daily.goal || f.goal;
  const S = sapa(f);
  const isPromo = /jual/i.test(goal) || /promo|diskon|bundling|launching|opening/i.test(t);
  let slides = [], title = '', covers = [], learning = '';
  const sl = (role, headline, subtext, visual) => ({ role, headline: sanitize(headline, f), subtext: sanitize(subtext, f), visual });

  if (isPromo) {
    const offer = f.promo || `${f.product}${f.price ? ' — ' + f.price : ''}`;
    title = cap1(offer);
    covers = [
      `${pick(rng, ['Akhirnya:', 'Buat yang nungguin:'])} ${lower1(offer)}` + emo(f, '🔥'),
      `${cap1(f.pain)}? Ini jawabannya`,
    ];
    slides = [
      sl('hook', covers[0], 'Swipe buat detailnya →', 'Teks besar di tengah, warna brand, foto produk samar di belakang'),
      sl('isi', `Kenapa ${S} bakal suka ini`, `${f.usp ? cap1(f.usp) + '. ' : ''}Dibuat buat ${S} yang ${lower1(f.pain)}.`, 'Foto produk hero + 3 ikon keunggulan'),
      ...(f.products.length > 1
        ? [sl('isi', 'Yang ' + S + ' dapetin', f.products.slice(0, 3).map(p => '• ' + p).join('\n'), 'Flat lay semua item, diberi label')]
        : [sl('isi', 'Lebih dekat lagi', `${cap1(f.product)} — ${f.usp ? lower1(f.usp) : 'detailnya bisa dilihat sendiri'}.`, 'Close-up detail produk')]),
      sl('isi', f.proof ? 'Bukan kata kami doang' : 'Real talk', f.proof ? cap1(f.proof) + '.' : `Cek sendiri ulasannya — biar ${S} yang menilai.`, 'Screenshot testimoni / rating pelanggan'),
      sl('isi', f.price ? `Harganya? ${f.price}` : 'Harganya masuk akal', `${f.promo ? cap1(f.promo) + '. ' : ''}${pick(rng, ['Nggak perlu nunggu tanggal tua.', 'Hitung-hitungannya masuk.'])}`, 'Harga besar + coretan harga lama kalau ada promo'),
      sl('cta', cap1(f.cta), `${f.promo ? 'Sebelum kehabisan — ' : ''}${lower1(f.cta)}${f.signature ? '. ' + cap1(f.signature) : ''}!`, 'Recap 3 poin + tombol CTA visual + logo brand'),
    ];
    learning = 'Carousel jualan tetap butuh alur: hook → alasan → isi → bukti → harga → CTA. Bukti sosial ditaruh sebelum harga biar harga terasa layak. Satu CTA aja di slide akhir — dua CTA = orang nggak milih dua-duanya.';
  } else {
    const kind = pick(rng, ['mistakes', 'signs', 'myths', 'tips']);
    const bank = f.bank[kind];
    const items = pickN(rng, bank, Math.min(5, bank.length));
    const label = { mistakes: 'kesalahan', signs: 'tanda', myths: 'mitos', tips: 'tips' }[kind];
    const subject = t ? lower1(t) : (kind === 'signs' ? lower1(f.pain) : (f.bank.niche || lower1(catOf(c).label.toLowerCase())));
    title = `${items.length} ${label} soal ${subject}`;
    covers = [
      `${items.length} ${label} ${kind === 'signs' ? subject : 'soal ' + subject}` + emo(f, kind === 'mistakes' ? '🚨' : '👀'),
      `${cap1(label)} yang ${pick(rng, ['sering banget kejadian', 'jarang disadari'])} — no. ${Math.min(3, items.length)} paling parah`,
    ];
    slides = [
      sl('hook', covers[0], `Nomor ${Math.min(3, items.length)} paling sering diabaikan → swipe`, 'Teks besar di tengah, background polos warna brand, panah swipe kecil'),
      ...items.map((it, i) => kind === 'myths'
        ? sl('isi', `${i + 1}. "${it.m}"`, `Faktanya: ${lower1(it.f)}`, 'Teks "MITOS" dicoret + fakta di bawahnya')
        : sl('isi', `${i + 1}. ${it.t}`, it.d, pick(rng, f.bank.visuals))),
      sl('cta', `Save dulu, praktikkan pelan-pelan` + emo(f, '📌'), `${cap1(f.cta)}. Tag temen yang butuh ini!`, 'Recap semua poin kecil-kecil + logo brand'),
    ];
    learning = `Slide 1 itu 80% penentu — pakai angka + curiosity gap ("no. ${Math.min(3, items.length)} paling sering diabaikan" = open loop). Satu ide per slide biar gampang dicerna. Slide akhir minta SAVE: carousel yang di-save dapat bobot ~3x like di algoritma.`;
  }

  const capRng = rng;
  const capHook = makeHooks(f, t, capRng, 1, daily.hook)[0];
  const caption = sanitize([
    capHook.text,
    '',
    isPromo
      ? `${f.promo ? cap1(f.promo) + '. ' : ''}Detail lengkap ada di slide — ${lower1(f.cta)}${closer(f, capRng)}!`
      : `Swipe sampai habis, terus cek: ${S} kena yang nomor berapa? Ceritain di komen${closer(f, capRng)}` + emo(f, '👇'),
  ].join('\n'), f);
  return {
    type: 'carousel', platform: 'Instagram', title, cover_alternatives: covers,
    slides: slides.map((s, i) => ({ slide: i + 1, ...s })),
    caption, hashtags: buildHashtags(f, t, rng),
    learning_note: learning,
    compliance_notes: c.category === 'skincare' ? 'Semua klaim dibingkai "membantu / tampak" — aman BPOM.' : '—',
  };
}

function genCaption(c, daily, seedN) {
  const rng = mulberry(c.id + '|caption|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const goal = daily.goal || f.goal;
  const S = sapa(f);
  const hooks = makeHooks(f, t, rng, 5, daily.hook);
  let body = [], formula = '';
  if (/jual/i.test(goal)) {
    formula = 'AIDA';
    body = [
      hooks[0].text, '',
      `${cap1(f.pain)} itu capek${closer(f, rng)}. Dan biasanya bukan karena kurang usaha — tapi karena belum ketemu yang pas.`, '',
      `${cap1(f.product)} dibuat buat itu.${f.usp ? ' ' + cap1(f.usp) + '.' : ''}${f.proof ? ' ' + cap1(f.proof) + '.' : ''}`, '',
      `Bayangin ${lower1(f.desire)} — tanpa drama, tanpa coba-coba lagi.`, '',
      `${f.promo ? cap1(f.promo) + ' ' : ''}${cap1(f.cta)}${closer(f, rng)}` + emo(f, '🛒'),
    ];
  } else if (/edukasi/i.test(goal)) {
    formula = 'PAS + tips';
    const tips = pickN(rng, f.bank.tips, 3);
    body = [
      hooks[0].text, '',
      `Banyak yang ${lower1(f.pain)} bukan karena nggak niat — tapi karena infonya simpang siur.`, '',
      'Yang beneran ngaruh justru simpel:',
      ...tips.map((tip, i) => `${i + 1}. ${cap1(tip.t)} — ${lower1(tip.d)}`), '',
      `Save dulu biar nggak lupa, terus ${lower1(f.cta)}${closer(f, rng)}` + emo(f, '📌'),
    ];
  } else if (/interaksi/i.test(goal)) {
    formula = 'Relatable + pertanyaan';
    body = [
      hooks[0].text, '',
      `Nggak cuma ${S} kok — ${lower1(pick(rng, f.pains))} itu hampir semua orang pernah${closer(f, rng)}.`, '',
      `Yang bikin beda cuma satu: berhenti di keluhan, atau mulai dari langkah kecil.`, '',
      `Jadi cerita dong: ${S} lagi di fase yang mana? Jawab di komen — kami baca satu-satu${closer(f, rng)}` + emo(f, '👇'),
    ];
  } else {
    formula = 'BAB (Before–After–Bridge)';
    body = [
      hooks[0].text, '',
      `Dulu: ${lower1(f.pain)}. Rasanya jalan di tempat.`, '',
      `Sekarang kebayang nggak — ${lower1(f.desire)}?`, '',
      `Jembatannya ada di ${lower1(f.product)}.${f.usp ? ' ' + cap1(f.usp) + '.' : ''} ${cap1(f.cta)} buat mulai${closer(f, rng)}.`,
    ];
  }
  if (f.signature) body.push('', cap1(f.signature) + emo(f, '✨'));
  const caption_long = sanitize(body.join('\n'), f);
  const caption_short = sanitize(`${hooks[1].text}\n${cap1(f.cta)}${closer(f, rng)}` + emo(f, '✨'), f);
  return {
    type: 'caption', formula,
    caption_long, caption_short,
    hooks: hooks.map(h => h.text), hook_details: hooks,
    hashtags: buildHashtags(f, t, rng),
    learning_note: `Formula ${formula}. Hook ditaruh di 125 karakter pertama (yang kelihatan sebelum tombol "more"). Baris pendek + jarak antar paragraf biar enak dibaca di HP. Satu CTA aja — lebih dari itu, orang malah nggak milih.`,
    compliance_notes: c.category === 'skincare' ? 'Klaim aman: "membantu / tampak", tanpa janji berlebihan.' : '—',
  };
}

function genStoryboard(c, daily, seedN) {
  const rng = mulberry(c.id + '|storyboard|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const target = parseInt(daily.durasi) || 30;
  const S = sapa(f);
  const formats = c.category === 'service'
    ? ['before-after', 'proses', 'talking']
    : c.category === 'fnb' ? ['proses', 'reaksi', 'talking'] : ['demo', 'proses', 'talking'];
  const fmt = pick(rng, formats);
  const sh = (visual, camera, talent_props, voiceover, ost, sfx, d) => ({ visual, camera, talent_props, voiceover: sanitize(voiceover, f), onscreen_text: sanitize(ost, f), sfx_music: sfx, duration_sec: d });
  let shots = [], concept = '', notes = '';
  const v1 = pick(rng, f.bank.visuals), v2 = pick(rng, f.bank.visuals.filter(x => x !== v1));

  if (fmt === 'before-after') {
    concept = `Before-after ${t ? lower1(t) : 'hasil kerja'} — bukti nyata tanpa banyak omong`;
    shots = [
      sh('Kondisi BEFORE — tunjukkan jujur apa adanya', 'Statis, eye-level', 'Lokasi asli, tanpa styling', `Ini kondisi awalnya. ${cap1(pick(rng, f.pains))}.`, 'BEFORE 😬', 'Musik tegang ringan', 4),
      sh('Tim mulai bekerja — tangan & alat close-up', 'Handheld mengikuti gerakan', 'Alat kerja utama, seragam tim', `Prosesnya nggak asal: ${f.usp ? lower1(f.usp) : 'tiap langkah ada standarnya'}.`, 'Prosesnya begini', 'Beat mulai naik', 8),
      sh('Time-lapse pengerjaan sampai hampir selesai', 'Statis di tripod (time-lapse)', 'Tripod HP wajib', '(tanpa VO — biarkan time-lapse bicara)', 'Menit demi menit…', 'Beat cepat', 7),
      sh('Reveal AFTER — angle sama persis dengan shot 1', 'Statis, angle identik shot 1', 'Hasil kerja yang rapi', `Dan… beres. ${f.proof ? cap1(f.proof) + '.' : 'Bedanya kelihatan sendiri.'}`, 'AFTER ✨', 'Drop musik puas', 6),
      sh('Kartu penutup + kontak', 'Teks di layar', 'Logo + kontak', `${f.promo ? cap1(f.promo) + '. ' : ''}${cap1(f.cta)}${closer(f, rng)}.`, ostShort(f.cta), 'Outro pendek', 5),
    ];
    notes = 'Kunci format ini: angle shot BEFORE dan AFTER harus identik (tandai posisi tripod pakai lakban). Kejujuran visual = kepercayaan.';
  } else if (fmt === 'proses') {
    concept = `Behind the scene: ${t ? lower1(t) : 'proses di balik ' + lower1(f.product)}`;
    shots = [
      sh('Hasil akhir dulu (teaser) — shot paling menggoda', 'Close-up, gerakan lambat', f.product, `${pick(rng, ['Pernah penasaran gimana', 'Ini cara'])} ${lower1(f.product)} ${pick(rng, ['dibuat?', 'disiapin tiap hari?'])}`, 'Dari mana ini dimulai?', 'Intro catchy', 4),
      sh(cap1(v1), 'Top-down statis', 'Bahan/alat utama', `Mulai dari yang paling penting: ${pick(rng, ['bahannya dipilih, bukan asal ada.', 'persiapannya nggak boleh asal.'])}`, 'Step 1: persiapan', 'Musik proses', 8),
      sh(cap1(v2), 'Handheld dekat, fokus tangan', 'Talent 1 orang', `Bagian ini yang bikin beda: ${f.usp ? lower1(f.usp) : 'detail kecil yang jarang orang lihat'}.`, 'Ini rahasianya 🤫', 'Musik lanjut', 9),
      sh('Hasil akhir utuh + reaksi puas', 'Eye-level, mundur perlahan', 'Hasil final', `Jadi deh. ${f.price ? 'Mulai ' + f.price.split(/[–-]/)[0].trim() + ' aja.' : ''} ${cap1(f.cta)}${closer(f, rng)}!`, ostShort(f.cta), 'Outro naik', 6),
    ];
    notes = 'Trik retensi: tunjukkan hasil akhir 1 detik di awal (teaser), baru prosesnya. Orang bertahan buat lihat "jadinya beneran kayak gitu nggak".';
  } else if (fmt === 'reaksi') {
    concept = `Reaksi jujur first bite: ${t ? lower1(t) : lower1(f.product)}`;
    shots = [
      sh('Menu diantar ke meja, steam masih ngepul', 'Tracking mengikuti piring', f.product + ', meja bersih', '(tanpa VO — sound sizzle/steam)', cap1(f.product), 'SFX asli dapur', 4),
      sh('Close-up tekstur — disiram/ditarik/dipotong', 'Macro close-up', 'Pencahayaan dari samping', '(tanpa VO — ASMR food)', '', 'ASMR: suara asli', 7),
      sh('First bite + reaksi jujur (jangan dibuat-buat)', 'Eye-level, fokus wajah', 'Talent yang ekspresif', `Oke ini… ${pick(rng, ['beneran nggak bohong.', 'kenapa baru nyoba sekarang sih.'])}`, pick(rng, ['GILA SIH INI', 'Nggak siap 😭']), 'Musik freeze saat gigit', 8),
      sh('Info harga + cara order di layar', 'Statis, teks besar', 'Menu + harga', `${f.price ? 'Harganya ' + f.price + ' aja. ' : ''}${cap1(f.cta)}${closer(f, rng)}!`, ostShort(f.cta), 'Outro', 5),
    ];
    notes = 'Reaksi harus jujur — penonton bisa mencium akting dari jarak satu kecamatan. Ambil beberapa take, pilih yang paling natural.';
  } else {
    concept = `Talking head + b-roll: ${t ? lower1(t) : lower1(pick(rng, f.bank.topics))}`;
    const tip = pick(rng, f.bank.tips);
    const openHook = makeHooks(f, t, rng, 1, daily.hook)[0].text;
    shots = [
      sh('Wajah ke kamera, langsung ke inti (tanpa salam!)', 'Eye-level, sedikit dekat', 'Talent 1, background rapi', `${openHook}.`, ostShort(openHook), 'Musik minimal', 4),
      sh('B-roll menguatkan poin: ' + v1, 'Insert close-up', 'Props sesuai topik', `${cap1(tip.t)} — ${lower1(tip.d)}`, ostShort(tip.t), 'Musik lanjut', 9),
      sh('Kembali ke wajah + gestur tangan', 'Eye-level, angle beda 15°', '-', `Dan yang paling sering dilupain: konsisten. Sekali-dua kali doang nggak akan kelihatan hasilnya.`, 'Konsisten > sempurna', 'Musik lanjut', 8),
      sh('B-roll penutup: ' + v2 + ' + teks CTA', 'Slow push-in', 'Produk/hasil', `${cap1(f.cta)}${closer(f, rng)} — ${pick(rng, ['nggak nyesel.', 'mulai dari yang kecil dulu.'])}`, ostShort(f.cta), 'Outro pendek', 5),
    ];
    notes = 'Ganti angle tiap ganti poin (cukup geser 15–20°) — pattern interrupt murah yang bikin video terasa "mahal". Jangan buka dengan salam: langsung hook.';
  }

  shots = scaleDur(shots, target).map((s, i) => ({ shot: i + 1, ...s }));
  return {
    type: 'storyboard', concept: sanitize(cap1(concept), f), duration_sec: target,
    shots, broll: pickN(rng, f.bank.visuals, 3).map(cap1),
    production_notes: notes + ' Semua shot cukup pakai HP + tripod kecil; cahaya terbaik: dekat jendela jam 7–10 pagi. Total waktu shoot ±30–45 menit.',
    cta: sanitize(cap1(f.cta), f),
    learning_note: 'Storyboard = peta sebelum shoot. Dengan shot list, kamu nggak akan bengong "abis ini ngapain" — hemat 1–2 jam per video dan hasilnya jauh lebih rapi.',
    compliance_notes: '—',
  };
}

function genIdeas(c, daily, seedN) {
  const rng = mulberry(c.id + '|ideas|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const S = sapa(f);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const tip = pick(rng, f.bank.tips), myth = pick(rng, f.bank.myths), mist = pick(rng, f.bank.mistakes);
  const plan = [
    { pillar: 'Edukasi', format: 'Reels', hook: `${pick(rng, [3, 5])} ${pick(rng, ['kesalahan', 'hal'])} soal ${lower1(pick(rng, f.bank.topics))}`, concept: `Angkat: "${mist.t}" — ${lower1(mist.d)} Format cepat, satu poin per beat.`, cta: 'Save biar nggak lupa' },
    { pillar: 'Social proof', format: 'Carousel', hook: f.proof ? cap1(f.proof) + ' — ini ceritanya' : `Kata mereka yang udah nyoba ${lower1(f.product)}`, concept: 'Kumpulan testimoni/ulasan asli + cerita singkat di baliknya. Screenshot asli lebih dipercaya daripada desain rapi.', cta: 'Komen kalau mau info lengkap' },
    { pillar: 'Edukasi', format: 'Reels', hook: `"${myth.m}" — mitos atau fakta?`, concept: `Bantah mitos: ${lower1(myth.f)} Tutup dengan tanya "mitos apa lagi yang pernah ${S} denger?"`, cta: 'Share ke yang masih percaya' },
    { pillar: 'Behind the scenes', format: 'Story', hook: `Sehari di balik ${f.name}`, concept: 'BTS santai 3–5 story: proses, tim, momen lucu. Nggak perlu rapi — justru yang mentah yang bikin dekat.', cta: 'Poll: mau lihat bagian mana lagi?' },
    { pillar: 'Hiburan', format: 'Reels', hook: `POV: ${lower1(pick(rng, f.pains))}`, concept: 'Skit ringan 10–15 detik dari struggle audiens. Brand muncul sekilas aja di akhir.', cta: 'Tag temen yang begini' },
    { pillar: 'Promosi', format: 'Carousel', hook: f.promo ? cap1(f.promo) : `${cap1(f.product)}: kenapa worth it`, concept: `Jualan jujur: keunggulan (${f.usp ? lower1(f.usp) : 'yang beneran dirasain pembeli'}) + harga transparan + cara order.`, cta: f.cta },
    { pillar: 'Komunitas', format: 'Story', hook: `Tanya dong: ${lower1(pick(rng, f.pains))} — ${S} gimana?`, concept: 'Question sticker. Besoknya, 3 jawaban terbaik dijadikan konten (minta izin dulu). Konten gratis + audiens merasa didengar.', cta: 'Kirim jawabanmu' },
  ];
  return {
    type: 'ideas',
    ideas: plan.map((p, i) => ({ no: i + 1, day: days[i], ...p, hook: sanitize(cap1(p.hook), f), concept: sanitize(p.concept, f), cta: sanitize(cap1(p.cta), f) })),
    learning_note: 'Rasio sehat 80/20: lima konten memberi (edukasi, hiburan, BTS, komunitas, bukti) untuk dua yang meminta (promosi + soft-sell). Akun yang tiap hari jualan pelan-pelan ditinggal — algoritma dan manusianya sama-sama capek.',
  };
}

// Registry jenis konten
const TYPES = {
  script:     { e: '🎬', label: 'Script Video',      desc: 'Reels/TikTok: 3 hook + adegan + CTA', gen: genScript },
  carousel:   { e: '🎠', label: 'Carousel IG',       desc: 'Slide per slide + preview, siap desain', gen: genCarousel },
  caption:    { e: '✍️', label: 'Caption + Hashtag', desc: 'Panjang + pendek + 5 hook cadangan', gen: genCaption },
  storyboard: { e: '🎥', label: 'Storyboard',        desc: 'Shot list realistis, tinggal shoot pakai HP', gen: genStoryboard },
  ideas:      { e: '🗓️', label: 'Ide Seminggu',      desc: '7 hari terisi, campuran pillar sehat', gen: genIdeas },
  paket:      { e: '⚡', label: 'Paket Lengkap',     desc: 'Script + carousel + caption sekaligus' },
};

/* ═══════════════════════ ANALYZER: REVIEW & KOMPETITOR ═══════════════════════
 * Analisis teks sungguhan (deteksi pola, bukan tebak-tebakan):
 * hook 3 detik, CTA, hashtag, keterbacaan, variasi pillar.
 */
const CTA_RE = /(link (di )?bio|cek bio|komen|comment|di-?dm|dm kami|dm aja|save dulu|save posting|share ke|tag (temen|teman)|follow (kami|terus|akun)|order|checkout|beli sekarang|kunjungi|klik link|gofood|grabfood|shopeefood|whatsapp|wa\.me|daftar sekarang|join|hubungi)/i;
const BAD_OPEN_RE = /^(halo|hai|hay|hi\b|hello|hey|assalamu|selamat (pagi|siang|sore|malam)|good (morning|afternoon)|dear)/i;
const HOOK_PATTERNS_DETECT = [
  { id: 'angka', label: 'Listicle berangka', re: /^\d+\s|\b\d+\s+(cara|tips|hal|tanda|kesalahan|alasan|langkah|menu|fakta)/i },
  { id: 'pov', label: 'POV relatable', re: /^pov\b/i },
  { id: 'tanya', label: 'Pertanyaan langsung', re: /^[^\n]{0,80}\?/ },
  { id: 'warning', label: 'Warning / stop', re: /\b(stop|jangan|awas|hati-?hati|fatal)\b/i },
  { id: 'curiosity', label: 'Curiosity gap', re: /\b(rahasia|ternyata|ini dia|jarang (dibahas|yang tau)|spill|nggak banyak yang)/i },
  { id: 'callout', label: 'Call-out audiens', re: /\b(buat (kamu|kalian|anda) yang|kalau kamu|khusus (buat|untuk))/i },
  { id: 'mitos', label: 'Mitos vs fakta', re: /\b(mitos|fakta atau|banyak yang percaya)\b/i },
  { id: 'jujur', label: 'Kejujuran radikal', re: /\b(jujur|real talk|nggak bohong|no bullshit)\b/i },
];
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2728}\u{2764}]/gu;

function parsePosts(raw) {
  let parts = String(raw || '').split(/\n\s*-{3,}\s*\n?/);
  if (parts.length === 1) parts = raw.split(/\n\s*\n(?=\S)/);
  return parts.map(s => s.trim()).filter(s => s.length > 5);
}
function analyzePost(text) {
  const firstLine = (text.split('\n').find(l => l.trim()) || '').trim();
  const patterns = HOOK_PATTERNS_DETECT.filter(p => p.re.test(firstLine));
  const badOpen = BAD_OPEN_RE.test(firstLine);
  let hook = 4;
  if (patterns.length) hook += 4;
  if (firstLine.length > 0 && firstLine.length <= 70) hook += 1;
  if (badOpen) hook -= 3;
  if (firstLine.length > 130) hook -= 2;
  hook = Math.max(1, Math.min(10, hook));
  const hashtags = (text.match(/#[\p{L}\d_]+/gu) || []).map(h => h.slice(1).toLowerCase());
  const megaTags = hashtags.filter(h => MEGA_TAGS.includes(h));
  const ctaMatches = text.match(new RegExp(CTA_RE.source, 'gi')) || [];
  const words = text.replace(/#[\p{L}\d_]+/gu, '').trim().split(/\s+/).filter(Boolean).length;
  const hasBreaks = /\n/.test(text.trim());
  const emojiCount = (text.match(EMOJI_RE) || []).length;
  let pillar = 'Cerita / lainnya';
  if (/(promo|diskon|\d+\s*%|rp ?\d|\d+rb|\bsale\b|gratis ongkir|checkout|order sekarang|beli)/i.test(text)) pillar = 'Promosi';
  else if (/(tips|cara |fakta|mitos|kenapa |tutorial|langkah|panduan|wajib tau)/i.test(text)) pillar = 'Edukasi';
  else if (/(komen|menurut (kamu|kalian)|tim mana|setuju nggak|pilih mana|tebak)/i.test(text)) pillar = 'Interaksi';
  else if (/(pov|relate|pernah nggak|jujur|cerita)/i.test(text)) pillar = 'Relatable';
  return { text, firstLine, patterns, badOpen, hook, hashtags, megaTags, ctaCount: ctaMatches.length, hasCTA: ctaMatches.length > 0, words, hasBreaks, emojiCount, pillar };
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const r1 = n => Math.round(n * 10) / 10;
const quote = s => '"' + (s.length > 72 ? s.slice(0, 70).trim() + '…' : s) + '"';

function analyzeAccount(posts) {
  const p = posts.map(analyzePost);
  const hookScore = r1(avg(p.map(x => x.hook)));
  const ctaCoverage = avg(p.map(x => x.hasCTA ? 1 : 0));
  const multiCta = p.filter(x => x.ctaCount > 2).length / p.length;
  const ctaScore = r1(Math.max(1, Math.min(10, ctaCoverage * 10 - multiCta * 2)));
  const tagCounts = p.map(x => x.hashtags.length);
  const medianTags = tagCounts.slice().sort((a, b) => a - b)[Math.floor(tagCounts.length / 2)] || 0;
  const megaShare = avg(p.map(x => x.hashtags.length ? x.megaTags.length / x.hashtags.length : 0));
  let tagScore = medianTags >= 3 && medianTags <= 5 ? 9 : medianTags >= 1 && medianTags <= 2 ? 6.5 : medianTags === 0 ? 3 : medianTags <= 10 ? 5 : 3;
  tagScore = r1(Math.max(1, tagScore - (megaShare > 0.3 ? 2 : 0)));
  const wall = p.filter(x => x.words > 60 && !x.hasBreaks).length / p.length;
  const avgWords = avg(p.map(x => x.words));
  let readScore = 8;
  if (avgWords < 12) readScore = 5.5;
  else if (avgWords > 220) readScore = 5;
  readScore = r1(Math.max(1, readScore - wall * 4));
  const pillars = {};
  p.forEach(x => { pillars[x.pillar] = (pillars[x.pillar] || 0) + 1; });
  const promoShare = (pillars['Promosi'] || 0) / p.length;
  const distinct = Object.keys(pillars).length;
  let varScore = r1(Math.max(1, Math.min(10, 3.5 + distinct * 1.6 - Math.max(0, promoShare - 0.35) * 9)));
  if (p.length < 3) varScore = Math.min(varScore, 6);
  const patternFreq = {};
  p.forEach(x => x.patterns.forEach(pt => { patternFreq[pt.label] = (patternFreq[pt.label] || 0) + 1; }));
  const overall = r1(hookScore * .3 + ctaScore * .2 + tagScore * .15 + readScore * .15 + varScore * .2);
  return { posts: p, n: p.length, hookScore, ctaScore, ctaCoverage, tagScore, medianTags, megaShare, readScore, wall, avgWords, varScore, pillars, promoShare, patternFreq, overall };
}

function reviewReport(c, raw) {
  const posts = parsePosts(raw);
  if (posts.length < 2) return { error: 'Butuh minimal 2 caption biar analisisnya adil. Tempel beberapa caption terakhirmu ya — pisahkan dengan baris berisi tiga strip (---).' };
  const a = analyzeAccount(posts);
  const f = factsOf(c);
  const strengths = [], weaknesses = [], recs = [];
  const bestHook = a.posts.slice().sort((x, y) => y.hook - x.hook)[0];
  const worstHook = a.posts.slice().sort((x, y) => x.hook - y.hook)[0];
  const badOpens = a.posts.filter(x => x.badOpen);
  const noCta = a.posts.filter(x => !x.hasCTA);

  if (a.hookScore >= 7) strengths.push(`Hook-mu udah kuat (rata-rata ${a.hookScore}/10). Contoh terbaik: ${quote(bestHook.firstLine)} — pertahankan pola ini.`);
  else { weaknesses.push(`Hook masih lemah (rata-rata ${a.hookScore}/10). ${badOpens.length ? badOpens.length + ' dari ' + a.n + ' post dibuka salam/basa-basi — contohnya ' + quote(badOpens[0].firstLine) + '.' : 'Baris pertama belum memancing berhenti scroll, contoh: ' + quote(worstHook.firstLine) + '.'}`);
    recs.push('Tulis ulang baris pertama tiap post: mulai dari masalah, angka, atau pertanyaan audiens — bukan salam. 50% penonton menentukan skip/lanjut di 3 detik pertama.'); }
  if (a.ctaCoverage >= 0.8) strengths.push(`${Math.round(a.ctaCoverage * 100)}% post-mu punya CTA — disiplin yang bagus, jarang ada akun sekonsisten ini.`);
  else { weaknesses.push(`${noCta.length} dari ${a.n} post nggak punya ajakan (CTA) sama sekali — konten bagus tapi audiens nggak dikasih tahu harus ngapain. Contoh: ${quote(noCta[0] ? noCta[0].firstLine : worstHook.firstLine)}.`);
    recs.push(`Tutup TIAP post dengan tepat satu ajakan. Buat brand-mu yang paling pas: "${f.cta}".`); }
  if (a.medianTags >= 3 && a.medianTags <= 5 && a.megaShare <= 0.3) strengths.push(`Jumlah hashtag-mu pas (median ${a.medianTags}) — di rentang sehat 3–5.`);
  else if (a.medianTags === 0) { weaknesses.push('Hampir nggak ada hashtag — kamu melewatkan jalur penemuan gratis.'); recs.push(`Pakai 3–5 hashtag campuran: niche + topik + branded. Contoh buatmu: ${buildHashtags(f, '', mulberry(c.id + 'tag')).join(' ')}.`); }
  else if (a.medianTags > 8) { weaknesses.push(`Hashtag kebanyakan (median ${a.medianTags}) — riset menunjukkan 3–5 tag mid-tier lebih efektif daripada 15+ tag campur aduk.`); recs.push('Pangkas jadi 3–5 hashtag paling relevan; buang tag jutaan post (#fyp #viral) karena kontenmu tenggelam dalam hitungan detik di sana.'); }
  else if (a.megaShare > 0.3) { weaknesses.push('Terlalu banyak mega-hashtag (#fyp, #viral, dsb) — di tag sebesar itu kontenmu bersaing dengan jutaan post per hari.'); recs.push('Ganti mega-tag dengan tag niche 10K–500K post — cukup besar untuk dilihat, cukup kecil untuk menang.'); }
  if (a.wall > 0.3) { weaknesses.push(`${Math.round(a.wall * a.n)} post berupa "tembok teks" tanpa jeda baris — di layar HP itu melelahkan dan bikin orang skip.`); recs.push('Pecah caption jadi baris-baris pendek dengan jarak antar paragraf — keterbacaan naik, waktu baca ikut naik.'); }
  else if (a.readScore >= 7.5) strengths.push('Caption-mu enak dibaca: ada jeda baris dan panjangnya wajar.');
  if (a.promoShare > 0.5) { weaknesses.push(`${Math.round(a.promoShare * 100)}% kontenmu jualan — kebalikan dari rasio sehat 80/20. Audiens (dan algoritma) capek kalau tiap hari diminta beli.`);
    recs.push('Terapkan 80/20: untuk tiap 1 konten jualan, selingi 4 konten memberi (tips, cerita, BTS, interaksi). Justru itu yang bikin konten jualanmu dipercaya.'); }
  else if (Object.keys(a.pillars).length >= 3) strengths.push(`Variasi kontenmu sehat: ${Object.keys(a.pillars).join(', ')}.`);
  if (!strengths.length) strengths.push('Kamu udah konsisten posting dan mau dievaluasi — itu modal yang banyak akun nggak punya.');
  if (recs.length < 3) recs.push(`Coba pola hook yang belum kamu pakai — generator di tab Bikin Konten udah diatur ke voice ${f.name}.`);

  return {
    type: 'review', overall: a.overall, n: a.n,
    scores: [
      { aspect: 'Hook 3 detik', score: a.hookScore, note: badOpens.length ? badOpens.length + ' post dibuka basa-basi' : 'diukur dari baris pertama tiap caption' },
      { aspect: 'CTA (ajakan)', score: a.ctaScore, note: Math.round(a.ctaCoverage * 100) + '% post punya ajakan jelas' },
      { aspect: 'Hashtag', score: a.tagScore, note: 'median ' + a.medianTags + ' tag/post' + (a.megaShare > 0.3 ? ', banyak mega-tag' : '') },
      { aspect: 'Keterbacaan', score: a.readScore, note: 'rata-rata ' + Math.round(a.avgWords) + ' kata/caption' },
      { aspect: 'Variasi konten', score: a.varScore, note: Math.round(a.promoShare * 100) + '% promosi · ' + Object.keys(a.pillars).length + ' jenis pillar' },
    ],
    strengths, weaknesses, recommendations: recs,
    quick_wins: [
      'Tulis ulang baris pertama 3 post terakhirmu pakai pola hook (angka / pertanyaan / POV) — bisa langsung diedit di IG.',
      'Pin post dengan hook terbaikmu ke profil: ' + quote(bestHook.firstLine),
      `Siapkan CTA baku biar nggak lupa: "${f.cta}".`,
    ],
    perPost: a.posts.map((p, i) => ({ no: i + 1, firstLine: p.firstLine, hook: p.hook, pattern: p.patterns[0] ? p.patterns[0].label : (p.badOpen ? 'dibuka basa-basi' : 'belum ada pola kuat'), hasCTA: p.hasCTA, tags: p.hashtags.length, pillar: p.pillar })),
    learning_note: 'Skor dihitung dari pola nyata di caption-mu: baris pertama (hook), ajakan (CTA), jumlah & jenis hashtag, jeda baris, dan campuran jenis konten. Bukan tebakan — semua ada buktinya di atas.',
  };
}

const GAP_PLAYS = [
  { label: 'Balas komentar dijadikan konten', re: /(balas|jawab|reply).{0,12}komen/i, idea: 'Tiap Jumat, ambil 1 komentar/pertanyaan menarik dan jawab lewat video — audiens merasa didengar, kamu dapat ide konten gratis.' },
  { label: 'Behind the scenes rutin', re: /(behind|di ?balik|bts\b|dapur|proses (produksi|pembuatan))/i, idea: 'Seri BTS mingguan: proses, tim, kegagalan kecil. Kompetitormu cuma pamer hasil — kamu tunjukkan perjalanannya.' },
  { label: 'Kejujuran soal ekspektasi', re: /(jujur|realistis|nggak instan|butuh waktu|no bullshit)/i, idea: 'Konten "ekspektasi realistis" — jujur soal batas produk/jasamu. Trust yang dibangun kompetitor lewat over-claim, kamu rebut lewat kejujuran.' },
  { label: 'Konten komunitas / UGC', re: /(repost|dari kalian|ugc|karya (kalian|customer)|foto dari pembeli)/i, idea: 'Repost konten pelanggan tiap minggu (minta izin). Bukti sosial gratis + pelanggan makin loyal karena diorangkan.' },
  { label: 'Seri edukasi bersambung', re: /(part \d|eps\.? ?\d|episode|seri\b)/i, idea: 'Bikin seri bersambung ("Part 1 dari 5") — alasan orang follow: takut ketinggalan kelanjutannya.' },
  { label: 'Format tanya-jawab interaktif', re: /(qna|q&a|tanya.{0,10}jawab|kotak pertanyaan|question sticker)/i, idea: 'Q&A story mingguan → jawaban terbaik jadi Reels. Dua konten dari satu usaha.' },
];
function compareReport(c, myRaw, comps) {
  const f = factsOf(c);
  const rng = mulberry(c.id + '|compare|' + comps.map(x => x.handle).join(','));
  const mine = myRaw && parsePosts(myRaw).length >= 2 ? analyzeAccount(parsePosts(myRaw)) : null;
  const rows = comps.map(cp => ({ handle: cp.handle, a: analyzeAccount(parsePosts(cp.raw)) }));
  const all = rows.map(r => r.a);
  const competitors = rows.map(r => {
    const topPatterns = Object.entries(r.a.patternFreq).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => k + ' (' + v + 'x)');
    const kelemahan = [];
    if (r.a.hookScore < 6) kelemahan.push('Hook lemah (skor ' + r.a.hookScore + '/10) — banyak post dibuka datar');
    if (r.a.ctaCoverage < 0.5) kelemahan.push('Sering lupa CTA (' + Math.round(r.a.ctaCoverage * 100) + '% post yang punya ajakan)');
    if (r.a.promoShare > 0.5) kelemahan.push('Kebanyakan jualan (' + Math.round(r.a.promoShare * 100) + '% promosi) — gampang bikin audiens jenuh');
    if (r.a.megaShare > 0.3) kelemahan.push('Bergantung pada mega-hashtag — jangkauannya nggak setarget kelihatannya');
    if (r.a.wall > 0.3) kelemahan.push('Caption tembok teks, melelahkan dibaca');
    if (!kelemahan.length) kelemahan.push('Eksekusinya rapi — lawan dengan sudut pandang & kejujuran, bukan format yang sama');
    const tiru = [];
    if (r.a.hookScore >= 7) tiru.push('Pola hook mereka works: ' + (topPatterns[0] || 'baris pertama langsung ke inti') + ' — adaptasi ke voice-mu, jangan salin kalimatnya');
    if (r.a.ctaCoverage >= 0.8) tiru.push('Disiplin CTA di hampir tiap post — kebiasaan yang layak dicontoh');
    if (r.a.varScore >= 7) tiru.push('Campuran kontennya sehat (' + Object.keys(r.a.pillars).join(', ') + ') — struktur mingguannya bisa diadaptasi');
    if (!tiru.length) tiru.push('Konsistensi posting-nya — sisanya justru peluangmu buat tampil lebih rapi');
    return { handle: r.handle, overall: r.a.overall, n: r.a.n, scores: r.a, hook_patterns: topPatterns.length ? topPatterns : ['(belum ada pola hook yang konsisten)'], tiru_adaptasi: tiru, kelemahan };
  });
  const gaps = GAP_PLAYS.filter(g => !all.some(a => a.posts.some(p => g.re.test(p.text))) && (!mine || !mine.posts.some(p => g.re.test(p.text))));
  const hook_bank = makeHooks(f, '', rng, 6).map(h => h.text + '  ·  (' + h.pattern + ')');
  const action_ideas = gaps.slice(0, 3).map(g => g.idea);
  competitors.forEach(cp => {
    const weak = cp.kelemahan[0];
    if (/hook lemah/i.test(weak)) action_ideas.push(`Serang di hook: ${cp.handle} buka post dengan datar — pastikan 3 detik pertamamu selalu pakai pola kuat (bank hook di bawah siap pakai).`);
    else if (/kebanyakan jualan/i.test(weak)) action_ideas.push(`${cp.handle} jualan terus — rebut audiensnya dengan konten memberi (tips & cerita) di topik yang sama.`);
  });
  while (action_ideas.length < 5 && gaps[action_ideas.length]) action_ideas.push(gaps[action_ideas.length].idea);
  return {
    type: 'compare', mine, competitors, gaps: gaps.map(g => g.label + ' — belum ada yang menggarap ini'), hook_bank, action_ideas: action_ideas.slice(0, 5),
    learning_note: 'Perbandingan dihitung dari caption asli yang kamu tempel — pola hook, CTA, hashtag, dan campuran konten dideteksi otomatis. Prinsipnya: tiru polanya, jangan kalimatnya; lalu menang di celah yang mereka tinggalkan.',
  };
}

/* ═══════════════════════ AI ENHANCER (opsional, fallback ke lokal) ═══════════════════════
 * Kalau user isi kunci AI di ⚙️, hasil generator disempurnakan model.
 * Kalau kunci kosong / AI error / format tak sesuai → tetap pakai mesin lokal.
 */
const SPEED_MODELS = {
  anthropic: { fast: 'claude-haiku-4-5-20251001', balanced: 'claude-sonnet-5', best: 'claude-opus-4-8' },
  openai:    { fast: 'gpt-4o-mini', balanced: 'gpt-4o', best: 'gpt-4o' },
};
const detectProvider = k => String(k).trim().startsWith('sk-ant-') ? 'anthropic' : 'openai';
const aiKey = () => (store.get('ce3_key', '') || '').trim();
const aiSpeed = () => store.get('ce3_speed', 'balanced');
const aiModelManual = () => (store.get('ce3_model', '') || '').trim();
const hasAI = () => !!aiKey();
function aiResolvedModel() {
  const key = aiKey(); if (!key) return '';
  const manual = aiModelManual(); if (manual) return manual;
  const p = detectProvider(key);
  return SPEED_MODELS[p][aiSpeed()] || SPEED_MODELS[p].balanced;
}
async function callAI(system, user) {
  const key = aiKey();
  const provider = detectProvider(key);
  const model = aiResolvedModel();
  const isOA = provider === 'openai';
  const url = isOA ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages';
  const headers = isOA
    ? { 'content-type': 'application/json', authorization: 'Bearer ' + key }
    : { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  const body = isOA
    ? { model, max_tokens: 3200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }
    : { model, max_tokens: 3200, system, messages: [{ role: 'user', content: user }] };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((isOA ? 'OpenAI' : 'Anthropic') + ' ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  const text = isOA
    ? (data.choices || []).map(c => c.message?.content || '').join('\n').trim()
    : (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text) throw new Error('balasan AI kosong');
  return text;
}
function buildBrandLines(c) {
  const f = factsOf(c); const L = [];
  const add = (k, v) => { if (v && String(v).trim()) L.push(k + ': ' + String(v).trim()); };
  add('Nama', f.name); add('Kategori', catOf(c).label); add('Produk/jasa', c.products);
  add('Harga', c.price); add('Pembeda (USP)', c.usp); add('Bukti', c.proof);
  add('Pembeli utama', c.buyer); add('Masalah pembeli', c.painpoint); add('Impian pembeli', c.desire);
  add('Nada bicara', toneList(c).join(', ')); add('Sapaan', f.sapaan); add('Emoji', f.emojiPref);
  add('Frasa khas (WAJIB dipakai)', c.signature);
  add('Kata TERLARANG (HARAM dipakai)', [c.forbidden, c.forbiddenClaims].filter(Boolean).join(', '));
  add('Tujuan konten', c.goal); add('CTA utama', c.cta); add('Promo aktif', c.promo);
  add('Area/pasar', c.area); add('Sertifikasi', c.certifications);
  if (c.brandGuide && String(c.brandGuide).trim()) L.push('Panduan brand (kutipan dari PDF guideline): ' + String(c.brandGuide).slice(0, 1500));
  return L.join('\n');
}
function buildAISystem(c) {
  const comply = c.category === 'skincare'
    ? 'COMPLIANCE SKINCARE (aturan BPOM): hanya klaim penampilan. DILARANG kata "menyembuhkan/mengobati/memutihkan/permanen/100%/nomor 1". Ganti dengan "membantu merawat/menyamarkan/mencerahkan tampilan", "kulit TAMPAK/TERASA lebih…".'
    : c.category === 'fnb' ? 'COMPLIANCE F&B: sebut channel order + harga jujur + status halal bila ada; tanpa klaim kesehatan/diet.'
    : 'COMPLIANCE UMUM: tanpa overclaim/superlatif kosong; jangan mengarang angka di luar profil brand.';
  return [
    'Kamu Content Strategist & Copywriter senior untuk agency konten di Indonesia. Bikin konten sosmed yang nempel banget sama karakter brand di bawah — kualitas tinggi, spesifik, tidak generik, dan aman aturan.',
    '', '=== PROFIL BRAND ===', buildBrandLines(c), '====================',
    '', 'PLAYBOOK: Hook kuat di 3 detik pertama (bukan salam). Struktur Hook→Build (value baru tiap 5–8 detik)→Payoff konkret→TEPAT 1 CTA. Caption: hook di 125 karakter pertama, baris pendek. Hashtag 3–5 mid-tier (hindari #fyp/#viral). Rasio konten 80% memberi / 20% jualan.',
    'ATURAN: Bahasa Indonesia sesuai nada brand; pakai sapaan brand; WAJIB pakai frasa khas bila ada; HARAM pakai kata terlarang brand; selalu sentuh pain point audiens; tutup dengan CTA brand.',
    '', comply,
    '', 'OUTPUT: kembalikan HANYA satu blok JSON valid (tanpa kalimat lain) dengan struktur field PERSIS seperti contoh yang diberikan user. Jangan mengubah nama field atau bentuknya. Isi tiap field kamu tulis ulang jadi versi terbaik & paling spesifik ke brand.',
  ].join('\n');
}
function buildAIUser(type, local, daily) {
  const map = { topic: 'Topik', goal: 'Tujuan', platform: 'Platform', durasi: 'Durasi' };
  const d = []; for (const k in map) if (daily[k]) d.push('- ' + map[k] + ': ' + daily[k]);
  return [
    'Buatkan ' + TYPES[type].label + '.',
    d.length ? 'Brief hari ini:\n' + d.join('\n') : 'Brief: ambil dari profil brand & promo aktif.',
    '', 'Kembalikan HANYA JSON dengan struktur PERSIS seperti contoh ini (ganti isinya dengan versi terbaikmu, jaga nama field & jumlah item mirip):',
    '```json', JSON.stringify(local), '```',
  ].join('\n');
}
function parseJSONBlock(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let raw = (m ? m[1] : text).trim();
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  try { return JSON.parse(raw); } catch (_) { return null; }
}
const AI_REQ = { script: ['hooks', 'scenes'], carousel: ['slides', 'caption'], caption: ['caption_long', 'hooks'], storyboard: ['shots'], ideas: ['ideas'] };
function aiShapeOK(type, o) {
  if (!o || typeof o !== 'object') return false;
  return (AI_REQ[type] || []).every(k => o[k] != null && (!Array.isArray(o[k]) || o[k].length));
}
function sanitizeDeep(o, f) {
  if (typeof o === 'string') return sanitize(o, f);
  if (Array.isArray(o)) return o.map(x => sanitizeDeep(x, f));
  if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = sanitizeDeep(o[k], f); return r; }
  return o;
}
const _pickArr = (a, fb) => Array.isArray(a) && a.length ? a : fb;
const _s = (v, d) => (v == null ? (d || '') : String(v));
function _cleanTags(a, fb) {
  const arr = _pickArr(a, fb).map(t => '#' + slugTag(String(t).replace(/^#/, ''))).filter(t => t.length > 3);
  return arr.length ? [...new Set(arr)].slice(0, 6) : fb;
}
function normalizeAI(type, ai, local) {
  const out = { ...local };
  ['title', 'frame', 'concept', 'formula', 'sound_suggestion', 'learning_note', 'compliance_notes', 'cta', 'caption', 'caption_long', 'caption_short', 'production_notes'].forEach(k => { if (ai[k] != null && String(ai[k]).trim()) out[k] = String(ai[k]); });
  if (type === 'script') {
    out.hooks = _pickArr(ai.hooks, local.hooks).slice(0, 3).map((h, i) => ({ text: cap1(_s(h.text, local.hooks[i] && local.hooks[i].text)), pattern: _s(h.pattern, (local.hooks[i] && local.hooks[i].pattern) || 'Hook'), why: _s(h.why, local.hooks[i] && local.hooks[i].why) }));
    const sc = _pickArr(ai.scenes, local.scenes).map(s => ({ visual: _s(s.visual), voiceover: _s(s.voiceover), onscreen_text: _s(s.onscreen_text), duration_sec: Math.max(2, parseInt(s.duration_sec) || 4) }));
    out.scenes = scaleDur(sc, local.duration_sec).map((s, i) => ({ scene: i + 1, ...s }));
  } else if (type === 'carousel') {
    out.cover_alternatives = _pickArr(ai.cover_alternatives, local.cover_alternatives).slice(0, 2).map(String);
    out.slides = _pickArr(ai.slides, local.slides).map((s, i, arr) => ({ slide: i + 1, role: _s(s.role, i === 0 ? 'hook' : i === arr.length - 1 ? 'cta' : 'isi'), headline: _s(s.headline), subtext: _s(s.subtext), visual: _s(s.visual, 'Visual pendukung sesuai headline') }));
    out.hashtags = _cleanTags(ai.hashtags, local.hashtags);
  } else if (type === 'caption') {
    out.hooks = _pickArr(ai.hooks, local.hooks).slice(0, 5).map(h => typeof h === 'string' ? h : _s(h.text));
    out.hook_details = null;
    out.hashtags = _cleanTags(ai.hashtags, local.hashtags);
  } else if (type === 'storyboard') {
    const sh = _pickArr(ai.shots, local.shots).map(s => ({ visual: _s(s.visual), camera: _s(s.camera, 'Eye-level'), talent_props: _s(s.talent_props, '-'), voiceover: _s(s.voiceover), onscreen_text: _s(s.onscreen_text), sfx_music: _s(s.sfx_music, 'Musik'), duration_sec: Math.max(2, parseInt(s.duration_sec) || 4) }));
    out.shots = scaleDur(sh, local.duration_sec).map((s, i) => ({ shot: i + 1, ...s }));
    out.broll = _pickArr(ai.broll, local.broll).map(String);
  } else if (type === 'ideas') {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    out.ideas = _pickArr(ai.ideas, local.ideas).slice(0, 7).map((it, i) => ({ no: i + 1, day: _s(it.day, days[i]), pillar: _s(it.pillar, 'Edukasi'), format: _s(it.format, 'Reels'), hook: cap1(_s(it.hook)), concept: _s(it.concept), cta: _s(it.cta, 'Save dulu') }));
  }
  return out;
}
/** Hasilkan konten: lokal dulu, lalu sempurnakan dengan AI kalau kunci ada. */
async function produce(c, type, daily, seed) {
  const local = TYPES[type].gen(c, daily, seed);
  if (!hasAI()) return { data: local, viaAI: false };
  try {
    const raw = await callAI(buildAISystem(c), buildAIUser(type, local, daily));
    const parsed = parseJSONBlock(raw);
    if (!aiShapeOK(type, parsed)) throw new Error('format AI tidak sesuai');
    return { data: sanitizeDeep(normalizeAI(type, parsed, local), factsOf(c)), viaAI: true };
  } catch (e) {
    toast('AI: ' + String(e.message || e).slice(0, 40) + ' — pakai mesin lokal');
    return { data: local, viaAI: false };
  }
}

/* ═══════════════════════ GAMBAR MOCKUP & REFERENSI FOTO ═══════════════════════
 * Offline: "gambar" = grafik SVG bergaya brand (bisa diunduh PNG), "referensi foto"
 * = grid shot-list ala feed IG. Tanpa API gambar / tanpa jaringan.
 */
const MOCK_PALETTES = [
  { bg: '#1C5B43', fg: '#FDFBF3', ac: '#F2B441' },
  { bg: '#E4572E', fg: '#FFF7F2', ac: '#1C5B43' },
  { bg: '#F6F0E3', fg: '#1C1712', ac: '#E4572E' },
  { bg: '#1C1712', fg: '#F6F0E3', ac: '#E4572E' },
  { bg: '#113D2C', fg: '#E1EEE6', ac: '#F2B441' },
  { bg: '#B44A1E', fg: '#FFF3E9', ac: '#F2B441' },
];
const xmlEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
function wrapText(str, max) {
  const words = String(str || '').split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur.trim()); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur.trim());
  return lines;
}
function paletteFor(c, i) { const base = Math.floor(mulberry(c.id + '|pal')() * MOCK_PALETTES.length); return MOCK_PALETTES[(base + i) % MOCK_PALETTES.length]; }
// Poster 4:5 (1080x1350) bergaya brand
function mockupSVG(pal, kicker, headline, sub, handle) {
  const H = wrapText(headline, 17).slice(0, 5);
  const S = wrapText(sub || '', 42).slice(0, 3);
  const hStart = 470 - (H.length - 1) * 46;
  const sStart = hStart + H.length * 92 + 6;
  const hLines = H.map((l, i) => `<text x="70" y="${hStart + i * 92}" fill="${pal.fg}" font-family="Georgia,serif" font-size="82" font-weight="700">${xmlEsc(l)}</text>`).join('');
  const sLines = S.map((l, i) => `<text x="72" y="${sStart + i * 46}" fill="${pal.fg}" font-family="Arial" font-size="34" opacity="0.85">${xmlEsc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="${pal.bg}"/><rect x="70" y="90" width="130" height="12" rx="6" fill="${pal.ac}"/><text x="70" y="180" fill="${pal.ac}" font-family="Arial" font-weight="700" font-size="30" letter-spacing="4">${xmlEsc(String(kicker).toUpperCase())}</text>${hLines}${sLines}<text x="70" y="1285" fill="${pal.fg}" font-family="Arial" font-size="30" opacity="0.7">@${xmlEsc(handle)}</text></svg>`;
}
const COMPO = ['close-up makro', 'flat lay dari atas', 'rule of thirds', 'framing simetris', 'banyak ruang kosong (negative space)', 'low angle dramatis', 'cahaya golden hour', 'candid natural'];
const MOODS = ['hangat & cozy', 'bersih & minimal', 'ceria & colorful', 'moody & elegan', 'segar & natural', 'bold & kontras'];
function photoTileSVG(pal, n, label, mood) {
  const L = wrapText(label, 20).slice(0, 3);
  const lines = L.map((l, i) => `<text x="34" y="${360 + i * 40}" fill="${pal.fg}" font-family="Arial" font-size="30" font-weight="600">${xmlEsc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.bg}"/><stop offset="1" stop-color="${pal.ac}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g${n})"/><text x="34" y="90" fill="${pal.fg}" font-family="Georgia,serif" font-size="72" font-weight="700" opacity="0.9">${n}</text><rect x="34" y="120" width="70" height="7" rx="3" fill="${pal.fg}" opacity="0.7"/>${lines}<text x="34" y="560" fill="${pal.fg}" font-family="Arial" font-size="24" opacity="0.75">📸 ${xmlEsc(mood)}</text></svg>`;
}
const svgDataURI = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
// Unduh SVG sebagai PNG (via canvas); fallback ke .svg kalau gagal
function downloadImage(svg, name, w, h) {
  const url = svgDataURI(svg);
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob(b => {
        if (!b) throw new Error('no blob');
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Gambar diunduh ✓');
      }, 'image/png');
    } catch (e) { const a = document.createElement('a'); a.href = url; a.download = name + '.svg'; a.click(); toast('Diunduh (SVG) ✓'); }
  };
  img.onerror = () => { const a = document.createElement('a'); a.href = url; a.download = name + '.svg'; a.click(); toast('Diunduh (SVG) ✓'); };
  img.src = url;
}
// Kumpulkan "kartu gambar" dari hasil generate (min 3)
function imageItemsFor(type, d, c) {
  const handle = slugTag(c.name);
  if (type === 'carousel') return d.slides.map(s => ({ kicker: 'Slide ' + s.slide, headline: s.headline, sub: s.subtext, handle }));
  if (type === 'caption') {
    const base = [{ kicker: 'Cover', headline: (d.hooks && d.hooks[0]) || d.caption_short, sub: '', handle }];
    (d.hooks || []).slice(1, 4).forEach((h, i) => base.push({ kicker: 'Alt ' + (i + 1), headline: h, sub: '', handle }));
    return base;
  }
  if (type === 'script') return (d.hooks || []).map((h, i) => ({ kicker: 'Cover ' + (i + 1), headline: h.text, sub: h.pattern, handle }));
  if (type === 'storyboard') return (d.shots || []).slice(0, 4).map((s, i) => ({ kicker: 'Frame ' + (i + 1), headline: s.onscreen_text || s.visual, sub: s.visual, handle }));
  return [];
}
function renderMockups(type, d, c, minN) {
  let items = imageItemsFor(type, d, c).filter(x => x.headline && String(x.headline).trim());
  if (!items.length) return null;
  // pastikan minimal N gambar
  const handle = slugTag(c.name);
  while (items.length < (minN || 3)) items.push({ kicker: 'Bonus', headline: d.title || d.concept || c.name, sub: c.usp || '', handle });
  const wrap = el('div');
  wrap.append(el('div', { class: 'asset-head' }, [
    el('b', { textContent: '🖼️ Gambar siap-pakai (' + items.length + ')' }),
    el('button', { textContent: '⬇️ Unduh semua', class: 'dl', style: 'padding:7px 14px;', onclick: () => { items.forEach((it, i) => setTimeout(() => downloadImage(mockupSVG(paletteFor(c, i), it.kicker, it.headline, it.sub, it.handle), slugTag(c.name) + '-' + type + '-' + (i + 1), 1080, 1350), i * 250)); } }),
  ]));
  const grid = el('div', { class: 'mockups' });
  items.forEach((it, i) => {
    const svg = mockupSVG(paletteFor(c, i), it.kicker, it.headline, it.sub, it.handle);
    grid.append(el('div', { class: 'mockup' }, [
      el('img', { src: svgDataURI(svg), alt: it.headline, loading: 'lazy' }),
      el('div', { class: 'cap' }, [
        el('span', { textContent: it.kicker }),
        el('button', { class: 'dl', textContent: '⬇️ PNG', onclick: () => downloadImage(svg, slugTag(c.name) + '-' + type + '-' + (i + 1), 1080, 1350) }),
      ]),
    ]));
  });
  wrap.append(grid);
  wrap.append(el('div', { class: 'tiny', style: 'margin-top:6px;', textContent: 'Grafik dasar bergaya brand — pas buat quote/tips card. Bisa langsung dipost atau dipoles di Canva.' }));
  return wrap;
}
function renderPhotoRefs(c, topic, n) {
  n = n || 8;
  const f = factsOf(c); const rng = mulberry(c.id + '|photoref|' + (topic || ''));
  const visuals = f.bank.visuals;
  const wrap = el('div');
  wrap.append(el('div', { class: 'asset-head' }, [el('b', { textContent: '📸 ' + n + ' referensi foto buat feed IG-mu' })]));
  wrap.append(el('div', { class: 'tiny', style: 'margin:-2px 0 8px;', textContent: 'Moodboard shot-list: 8 angle foto yang saling nyambung buat grid feed rapi. Pakai sebagai panduan motret / brief fotografer.' }));
  const grid = el('div', { class: 'feedgrid' });
  const refs = [];
  for (let i = 0; i < n; i++) {
    const v = visuals[i % visuals.length];
    const label = cap1(v) + ' · ' + COMPO[i % COMPO.length];
    const mood = pick(rng, MOODS);
    refs.push({ label, mood });
    const svg = photoTileSVG(paletteFor(c, i), i + 1, label, mood);
    grid.append(el('div', { class: 'feedcell' }, el('img', { src: svgDataURI(svg), alt: label, title: label + ' — ' + mood, loading: 'lazy' })));
  }
  wrap.append(grid);
  // daftar teks biar bisa disalin
  const list = el('ul', { class: 'clean num', style: 'margin-top:10px;' });
  refs.forEach(r => list.append(el('li', { textContent: r.label + ' — nuansa ' + r.mood })));
  const det = el('details', { class: 'adv' }, [el('summary', { textContent: '📋 Lihat & salin daftar 8 referensi' }), list,
    el('button', { textContent: '📋 Salin daftar', style: 'margin-top:8px;', onclick: () => copyText(refs.map((r, i) => (i + 1) + '. ' + r.label + ' — nuansa ' + r.mood).join('\n'), '8 referensi foto') })]);
  wrap.append(det);
  return wrap;
}
// Blok tambahan untuk hasil IG: min 3 gambar + (kalau IG Feed) 8 referensi foto
function igExtras(type, d, c, daily) {
  const platform = (daily && daily.platform) || '';
  const isIG = type === 'carousel' || /^IG /.test(platform);
  if (!isIG) return null;
  const box = el('div');
  const m = renderMockups(type, d, c, 3);
  if (m) { box.append(el('div', { class: 'divider' })); box.append(m); }
  if (platform === 'IG Feed' || type === 'carousel') box.append(renderPhotoRefs(c, daily && daily.topic, 8));
  return box.children.length ? box : null;
}

/* ═══════════════════════ PDF BRAND GUIDELINE (offline) ═══════════════════════ */
async function inflateMaybe(bytes) {
  for (const fmt of ['deflate', 'deflate-raw']) {
    try {
      if (typeof DecompressionStream === 'undefined') return null;
      const ds = new DecompressionStream(fmt);
      const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
      return new Uint8Array(buf);
    } catch (_) { /* coba format lain */ }
  }
  return null;
}
function pdfTextFromStream(latin1) {
  const out = [];
  const re = /\(((?:\\[\s\S]|[^()\\])*)\)/g; let m;
  while ((m = re.exec(latin1))) {
    const t = m[1].replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8) & 0xff)).replace(/\\([()\\nrt])/g, (_, ch) => ({ n: '\n', r: '', t: ' ' }[ch] != null ? ({ n: '\n', r: '', t: ' ' }[ch]) : ch));
    if (t && /[a-zA-Z]/.test(t)) out.push(t);
  }
  return out.join(' ');
}
async function extractPdfText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const CH = 32768; let latin1 = '';
  for (let i = 0; i < bytes.length; i += CH) latin1 += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  let text = pdfTextFromStream(latin1);
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g; let m; const parts = [];
  while ((m = re.exec(latin1)) && parts.length < 60) {
    const raw = m[1]; const b = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i) & 0xff;
    const inf = await inflateMaybe(b);
    if (inf) { let s = ''; for (let i = 0; i < inf.length; i += CH) s += String.fromCharCode.apply(null, inf.subarray(i, i + CH)); parts.push(pdfTextFromStream(s)); }
  }
  text = (text + ' ' + parts.join(' ')).replace(/\s+/g, ' ').trim();
  return text.slice(0, 6000);
}

/* ═══════════════════════ PROFIL: KEKUATAN ═══════════════════════ */
const STRENGTH_FIELDS = [
  ['name', 2], ['category', 2], ['products', 2], ['buyer', 2], ['painpoint', 2],
  ['tone', 1.5], ['sapaan', 1.5], ['goal', 1], ['cta', 1.5],
  ['price', 1], ['usp', 1.5], ['proof', 1], ['desire', 1], ['promo', .5],
  ['forbiddenClaims', .5], ['signature', .5], ['social', .5], ['comp1', .5], ['brandGuide', .5],
];
function profileStrength(c) {
  let got = 0, total = 0;
  for (const [k, w] of STRENGTH_FIELDS) { total += w; if (c[k] && String(c[k]).trim()) got += w; }
  if (Array.isArray(c.competitors) && c.competitors.length) got += .5;
  return Math.min(100, Math.round(got / total * 100));
}
function strengthBar(pct, hint) {
  return el('div', { class: 'strength' }, [
    el('div', { class: 'bar' }, el('i', { style: 'width:' + pct + '%;' + (pct < 50 ? 'background:var(--coral);' : pct < 75 ? 'background:var(--gold);' : '') })),
    el('span', { class: 'tiny', textContent: (hint ? 'profil ' : '') + pct + '%' }),
  ]);
}

/* ═══════════════════════ WIZARD ONBOARDING ═══════════════════════ */
const WIZ_STEPS = [
  { id: 'nama', emoji: '👋', title: 'Halo! Nama brand-mu apa?', sub: 'Santai aja — semua jawaban bisa diubah kapan pun.',
    fields: [{ id: 'name', type: 'text', ph: 'contoh: GlowUp Skincare', req: true, enter: true }] },
  { id: 'kategori', emoji: '🏪', title: 'Bidangnya apa?', sub: 'Ini menentukan contoh, saran, dan aturan aman yang kami siapkan buatmu.',
    fields: [{ id: 'category', type: 'cats', req: true }] },
  { id: 'produk', emoji: '🛍️', title: 'Yang paling diandalkan buat dijual?', sub: 'Sebut 1–3 aja, yang paling sering mau dipromosikan.',
    fields: [
      { id: 'products', label: 'Produk / menu / jasa andalan', type: 'textarea', ph: 'contoh: Serum Niacinamide 10%, Sunscreen SPF50', req: true },
      { id: 'price', label: 'Kisaran harganya? (opsional)', type: 'text', ph: 'contoh: Rp79rb–145rb', enter: true },
    ] },
  { id: 'beda', emoji: '✨', title: 'Apa yang bikin kamu beda?', sub: 'Kalau bingung, tap salah satu contoh di bawah — nanti bisa diedit.',
    fields: [
      { id: 'usp', label: 'Pembeda utama (USP)', type: 'text', ph: 'contoh: ringan, ber-BPOM, ramah pemula', sugg: 'usps' },
      { id: 'proof', label: 'Bukti yang bisa dipamerin (opsional)', type: 'text', ph: 'contoh: 10.000+ terjual, rating 4.9', enter: true },
    ] },
  { id: 'pembeli', emoji: '🎯', title: 'Siapa pembeli utamamu?', sub: 'Konten yang bagus itu ngomong ke satu orang, bukan ke semua orang.',
    fields: [{ id: 'buyer', type: 'text', ph: 'contoh: cewek 18–28, mahasiswa & first jobber', req: true, sugg: 'buyers', enter: true }] },
  { id: 'masalah', emoji: '😖', title: 'Masalah mereka yang kamu selesaikan?', sub: 'Ini bahan bakar utama semua konten. Tap beberapa contoh sekaligus boleh banget.',
    fields: [
      { id: 'painpoint', label: 'Masalah / keluhan mereka', type: 'textarea', ph: 'contoh: kulit kusam, takut produk abal-abal', req: true, sugg: 'pains', append: true },
      { id: 'desire', label: 'Impian mereka? (opsional)', type: 'text', ph: 'contoh: tampil pede tanpa makeup tebal', sugg: 'desires', enter: true },
    ] },
  { id: 'gaya', emoji: '🗣️', title: 'Gaya ngomong brand-mu?', sub: 'Semua hasil bakal ditulis dengan gaya ini.',
    fields: [
      { id: 'tone', label: 'Nada bicara (boleh pilih lebih dari satu)', type: 'pills-multi', options: TONE_LIST, req: true },
      { id: 'sapaan', label: 'Manggil audiens apa?', type: 'pills-custom', options: SAPAANS, req: true },
    ] },
  { id: 'bumbu', emoji: '🧂', title: 'Bumbu bahasanya', sub: 'Opsional, tapi bikin hasil makin "kamu banget".',
    fields: [
      { id: 'emoji', label: 'Pakai emoji?', type: 'pills', options: EMOJIS },
      { id: 'signature', label: 'Frasa khas brand (opsional)', type: 'text', ph: 'contoh: "glow bareng GlowUp"' },
      { id: 'forbidden', label: 'Kata yang JANGAN pernah dipakai (opsional)', type: 'text', ph: 'contoh: murahan, lebay', enter: true },
      { id: 'brandGuide', label: '📄 Brand guideline (PDF, opsional)', type: 'pdf' },
    ] },
  { id: 'tujuan', emoji: '📣', title: 'Kontennya buat apa?', sub: 'Semua konten diarahkan ke tujuan ini.',
    fields: [
      { id: 'goal', label: 'Tujuan utama', type: 'pills', options: GOALS, req: true },
      { id: 'cta', label: 'Ajakan di akhir konten (CTA)', type: 'pills-custom', options: CTAS, req: true },
      { id: 'promo', label: 'Promo yang lagi jalan (opsional)', type: 'text', ph: 'contoh: Glow Bundle 149rb s/d Minggu', enter: true },
    ] },
  { id: 'aman', emoji: '🛡️', title: 'Biar kontenmu aman', sub: 'Kami udah isikan aturan umum bidangmu — cek & sesuaikan aja.', skippable: true,
    fields: [
      { id: 'forbiddenClaims', label: 'Klaim yang dilarang', type: 'text', ph: 'contoh: menyembuhkan, putih permanen' },
      { id: 'certifications', label: 'Sertifikasi yang boleh disebut', type: 'text', ph: 'contoh: BPOM, Halal MUI', enter: true },
    ] },
  { id: 'saingan', emoji: '🔭', title: 'Terakhir: akun & saingan', sub: 'Buat fitur review & bandingkan kompetitor. Boleh dilewati.', skippable: true,
    fields: [
      { id: 'social', label: 'Akun IG brand-mu', type: 'text', ph: '@brandku' },
      { id: 'comp1', label: 'Kompetitor 1', type: 'text', ph: '@saingan_utama' },
      { id: 'comp2', label: 'Kompetitor 2', type: 'text', ph: '@saingan_lain' },
      { id: 'comp3', label: 'Kompetitor 3', type: 'text', ph: '@satu_lagi', enter: true },
    ] },
];
let wiz = null;
function startWizard(client, stepIdx = 0) {
  wiz = { draft: client ? { ...client } : { id: uid(), category: '' }, step: stepIdx, isNew: !client };
  renderWizard();
}
function renderWizard() {
  const steps = WIZ_STEPS;
  const step = steps[wiz.step];
  const app = $('#app'); app.innerHTML = '';
  const box = el('div', { class: 'wiz view' });
  box.append(el('div', { class: 'wiz-top' }, [
    el('button', { class: 'ghost', textContent: '✕', title: 'Keluar', onclick: () => {
      if (wiz.isNew && wiz.draft.name && !confirm('Keluar? Isian belum tersimpan.')) return;
      wiz = null; renderHome();
    } }),
    el('div', { class: 'wiz-progress' }, el('i', { style: 'width:' + Math.round((wiz.step) / steps.length * 100) + '%;' })),
    el('span', { class: 'tiny', textContent: (wiz.step + 1) + '/' + steps.length }),
  ]));
  box.append(el('div', { class: 'emoji', textContent: step.emoji }));
  box.append(el('h2', { textContent: step.title }));
  box.append(el('div', { class: 'sub', textContent: step.sub }));
  const form = el('div', { class: 'card' });
  step.fields.forEach(f => form.append(wizField(f)));
  box.append(form);
  const last = wiz.step === steps.length - 1;
  const nav = el('div', { class: 'wiz-nav' });
  if (wiz.step > 0) nav.append(el('button', { textContent: '← Balik', onclick: () => { wiz.step--; renderWizard(); } }));
  nav.append(el('span', { class: 'spacer' }));
  if (step.skippable && !last) nav.append(el('button', { class: 'ghost', textContent: 'Lewati', onclick: () => { wiz.step++; renderWizard(); } }));
  nav.append(el('button', { class: 'primary big', textContent: last ? '🎉 Simpan brand!' : 'Lanjut →', onclick: wizNext }));
  box.append(nav);
  app.append(box);
  window.scrollTo({ top: 0 });
  const firstInput = form.querySelector('input, textarea');
  if (firstInput && wiz.step === 0) firstInput.focus();
}
function wizNext() {
  const step = WIZ_STEPS[wiz.step];
  for (const f of step.fields) {
    const v = wiz.draft[f.id];
    const empty = Array.isArray(v) ? v.length === 0 : !(v && String(v).trim());
    if (f.req && empty) {
      toast('Isi dulu ya: ' + (f.label || step.title.replace(/\?$/, ''))); return;
    }
  }
  // prefill aturan aman ketika kategori baru dipilih
  if (step.id === 'kategori') {
    const bank = BANK[wiz.draft.category] || BANK.other;
    if (!wiz.draft.forbiddenClaims) wiz.draft.forbiddenClaims = bank.forbiddenDefault;
    if (!wiz.draft.certifications && bank.certDefault) wiz.draft.certifications = bank.certDefault;
  }
  if (wiz.step === WIZ_STEPS.length - 1) return finishWizard();
  wiz.step++; renderWizard();
}
function wizField(f) {
  const wrap = el('div');
  if (f.label) {
    const lbl = el('label', {}, [f.label]);
    if (f.req) lbl.append(el('span', { class: 'req', textContent: ' *' }));
    wrap.append(lbl);
  }
  const val = wiz.draft[f.id] || '';
  if (f.type === 'pdf') {
    const status = el('div', { class: 'hint', textContent: wiz.draft.brandGuideName ? ('✓ ' + wiz.draft.brandGuideName + ' — ' + (wiz.draft.brandGuide ? (wiz.draft.brandGuide.length + ' karakter terbaca') : 'teks tidak terbaca')) : 'Upload PDF panduan brand (warna, tone, do/don\'t). Teksnya kami baca buat nyetir hasil AI. Diproses di browser — tidak diunggah.' });
    const inp = el('input', { type: 'file', accept: 'application/pdf,.pdf' });
    inp.onchange = async () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      status.textContent = '⏳ Membaca ' + file.name + '…';
      try {
        const buf = await file.arrayBuffer();
        const text = await extractPdfText(buf);
        wiz.draft.brandGuide = text; wiz.draft.brandGuideName = file.name;
        status.textContent = text && text.length > 40
          ? ('✓ ' + file.name + ' — ' + text.length + ' karakter terbaca, dipakai buat nyetir hasil')
          : ('⚠️ ' + file.name + ' kebaca tapi teksnya sedikit (mungkin PDF gambar). Poin penting bisa ditulis manual di frasa khas / USP.');
      } catch (e) { status.textContent = '❌ Gagal baca PDF: ' + String(e.message || e).slice(0, 60); }
    };
    wrap.append(inp);
    wrap.append(status);
    if (wiz.draft.brandGuideName) wrap.append(el('button', { class: 'ghost', style: 'margin-top:8px;', textContent: '🗑️ Hapus PDF', onclick: () => { delete wiz.draft.brandGuide; delete wiz.draft.brandGuideName; renderWizard(); } }));
    return wrap;
  }
  if (f.type === 'cats') {
    const grid = el('div', { class: 'cat-grid' });
    CATS.forEach(c => {
      const card = el('div', { class: 'cat-card' + (wiz.draft.category === c.id ? ' on' : '') }, [
        el('span', { class: 'e', textContent: c.e }), c.label,
      ]);
      card.onclick = () => { wiz.draft.category = c.id; wizNext(); };
      grid.append(card);
    });
    wrap.append(grid);
  } else if (f.type === 'pills-multi') {
    // checkbox-style: boleh pilih beberapa (dipakai untuk Nada bicara)
    const cur = Array.isArray(val) ? val.slice() : (val ? [val] : []);
    wiz.draft[f.id] = cur;
    const pills = el('div', { class: 'pills' });
    f.options.forEach(o => {
      const on = cur.includes(o);
      const p = el('button', { class: 'pill' + (on ? ' on' : ''), textContent: (on ? '✓ ' : '') + o });
      p.onclick = e => {
        e.preventDefault();
        const i = cur.indexOf(o);
        if (i >= 0) cur.splice(i, 1); else cur.push(o);
        wiz.draft[f.id] = cur;
        p.classList.toggle('on', cur.includes(o));
        p.textContent = (cur.includes(o) ? '✓ ' : '') + o;
      };
      pills.append(p);
    });
    wrap.append(pills);
    wrap.append(el('div', { class: 'hint', textContent: 'Pilih 1–3 yang paling nggambarin brand-mu. Tone pertama jadi acuan utama.' }));
  } else if (f.type === 'pills' || f.type === 'pills-custom') {
    const pills = el('div', { class: 'pills' });
    let custom = null;
    const setVal = v => { wiz.draft[f.id] = v; pills.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.v === v)); if (custom && f.options.includes(v)) custom.value = ''; };
    f.options.forEach(o => {
      const p = el('button', { class: 'pill' + (val === o ? ' on' : ''), textContent: o });
      p.dataset.v = o; p.onclick = e => { e.preventDefault(); setVal(o); };
      pills.append(p);
    });
    wrap.append(pills);
    if (f.type === 'pills-custom') {
      custom = el('input', { type: 'text', placeholder: 'atau ketik sendiri…', value: f.options.includes(val) ? '' : val, style: 'margin-top:10px;' });
      custom.oninput = () => { if (custom.value.trim()) { wiz.draft[f.id] = custom.value.trim(); pills.querySelectorAll('.pill').forEach(p => p.classList.remove('on')); } };
      wrap.append(custom);
    }
  } else {
    // placeholder menyesuaikan kategori yang dipilih — biar contohnya selalu relevan
    const bank0 = BANK[wiz.draft.category];
    const PH_DYN = bank0 ? {
      buyer: 'contoh: ' + bank0.buyers[0],
      painpoint: 'contoh: ' + bank0.pains.slice(0, 2).join(', '),
      desire: 'contoh: ' + bank0.desires[0],
      usp: 'contoh: ' + bank0.usps[0],
    } : {};
    const input = el(f.type === 'textarea' ? 'textarea' : 'input', { value: val, placeholder: PH_DYN[f.id] || f.ph || '' });
    if (f.type !== 'textarea') { input.type = 'text'; if (f.enter) input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); wizNext(); } }; }
    input.oninput = () => { wiz.draft[f.id] = input.value; };
    wrap.append(input);
    if (f.sugg) {
      const bank = BANK[wiz.draft.category] || BANK.other;
      const opts = bank[f.sugg] || [];
      if (opts.length) {
        const sugg = el('div', { class: 'sugg' });
        opts.forEach(o => sugg.append(el('button', { textContent: '+ ' + o, onclick: e => {
          e.preventDefault();
          if (f.append && input.value.trim()) input.value = input.value.replace(/[,\s]+$/, '') + ', ' + o;
          else input.value = o;
          wiz.draft[f.id] = input.value;
        } })));
        wrap.append(sugg);
      }
    }
  }
  return wrap;
}
function finishWizard() {
  const d = wiz.draft;
  d.competitors = [d.comp1, d.comp2, d.comp3].map(x => (x || '').trim()).filter(Boolean);
  saveClient(d);
  const id = d.id, isNew = wiz.isNew;
  wiz = null;
  if (isNew) renderDone(d);
  else { toast('Profil diperbarui ✓'); openBrand(id, 'profil'); }
}
function renderDone(c) {
  const app = $('#app'); app.innerHTML = '';
  const pct = profileStrength(c);
  const box = el('div', { class: 'wiz view', style: 'text-align:center; padding-top:34px;' });
  box.append(el('div', { class: 'done-burst', textContent: '🎉' }));
  box.append(el('h2', { style: 'font-size:34px; font-weight:900;', html: `${c.name} <em class="fancy">siap gas!</em>` }));
  box.append(el('p', { class: 'muted', style: 'max-width:420px; margin:12px auto 0;', textContent: 'Profil brand-mu udah kami pelajari. Mulai sekarang, semua script, carousel, dan caption dibuat dengan gaya & fakta brand-mu — bukan template pasaran.' }));
  const card = el('div', { class: 'card', style: 'max-width:380px; margin:22px auto 0; text-align:left;' });
  card.append(el('b', { textContent: 'Kekuatan profil' }));
  card.append(strengthBar(pct));
  card.append(el('div', { class: 'hint', textContent: pct >= 75 ? 'Mantap! Makin lengkap profil, makin tajam hasilnya.' : 'Cukup buat mulai. Lengkapi kapan pun di tab Profil biar hasil makin tajam.' }));
  box.append(card);
  box.append(el('div', { class: 'row', style: 'justify-content:center; margin-top:26px;' }, [
    el('button', { class: 'primary big', textContent: '✨ Bikin konten pertamaku', onclick: () => openBrand(c.id, 'bikin') }),
  ]));
  app.append(box);
  window.scrollTo({ top: 0 });
}

/* ═══════════════════════ HOME ═══════════════════════ */
function renderHome() {
  const app = $('#app'); app.innerHTML = '';
  const clients = loadClients();
  const v = el('div', { class: 'view' });
  if (!clients.length) {
    v.append(el('div', { class: 'hero' }, [
      el('span', { class: 'kicker', textContent: '⚡ Gratis · tanpa daftar · langsung jadi' }),
      el('h1', { html: 'Konten sosmed yang<br/><em class="fancy">kamu banget</em> — dalam hitungan detik.' }),
      el('p', { class: 'lead', textContent: 'Ceritakan brand-mu sekali (3 menit). Habis itu tiap hari tinggal klik: script video, carousel, caption + hashtag, storyboard, sampai riset kompetitor.' }),
      el('div', { class: 'hero-cta' }, [
        el('button', { class: 'primary big', textContent: 'Mulai — ceritain brand-ku →', onclick: () => startWizard(null) }),
        el('button', { class: 'big', textContent: '🎁 Coba brand contoh dulu', onclick: seedClients }),
      ]),
      el('div', { class: 'feature-band' }, [
        ['🎬', 'Script Reels & TikTok', '3 hook + adegan + CTA, tinggal shoot'],
        ['🎠', 'Carousel + preview', 'slide per slide, langsung kelihatan jadinya'],
        ['✍️', 'Caption & hashtag', 'panjang, pendek, 5 hook cadangan'],
        ['🗓️', 'Ide seminggu', '7 hari terisi, rasio 80/20 sehat'],
        ['🔍', 'Review & kompetitor', 'analisis asli dari caption-mu'],
      ].map(([e, b, s]) => el('div', { class: 'feat' }, [el('span', { class: 'e', textContent: e }), el('b', { textContent: b }), el('span', { textContent: s })]))),
    ]));
  } else {
    v.append(el('div', { class: 'home-head' }, [
      el('h1', { html: 'Mau bikin konten<br/>buat siapa hari ini?' }),
    ]));
    const grid = el('div', { class: 'brand-grid' });
    clients.forEach((c, i) => {
      const cat = catOf(c);
      const pct = profileStrength(c);
      const card = el('div', { class: 'card brand-card', onclick: () => openBrand(c.id) }, [
        el('div', { class: 'row between' }, [
          el('div', { class: 'avatar' + (i % 2 ? ' coral' : ''), textContent: (c.name || '?').trim().charAt(0).toUpperCase() }),
          el('span', { class: 'chip', textContent: cat.e + ' ' + cat.label }),
        ]),
        el('h3', { textContent: c.name || '(tanpa nama)' }),
        strengthBar(pct, true),
      ]);
      grid.append(card);
    });
    grid.append(el('div', { class: 'add-card', onclick: () => startWizard(null), textContent: '＋ Tambah brand' }));
    v.append(grid);
  }
  app.append(v);
}
function seedClients() {
  const list = loadClients();
  const seeds = [
    { id: uid(), name: 'GlowUp Skincare', category: 'skincare', area: 'Nasional (online)', social: '@glowupskin.id',
      products: 'Serum Niacinamide 10%, Sunscreen SPF50, Gentle Cleanser', price: 'Rp79rb–145rb',
      usp: 'Ringan, ber-BPOM, ramah pemula', proof: '10.000+ terjual, rating 4.9',
      buyer: 'Cewek 18–28, mahasiswa & first jobber', painpoint: 'Kulit kusam padahal rajin cuci muka, bekas jerawat susah pudar, takut produk abal-abal', desire: 'Tampil pede tanpa makeup tebal',
      tone: 'Santai & friendly', sapaan: 'kak', emoji: 'secukupnya', signature: 'glow bareng GlowUp', forbidden: 'murahan',
      goal: 'Jualan', cta: 'Checkout link di bio', promo: 'Glow Bundle 149rb (normal 210rb) s/d Minggu',
      forbiddenClaims: 'menyembuhkan jerawat, putih permanen, 100% ampuh', certifications: 'BPOM',
      comp1: '@glowrivalid', comp2: '@bersinarskin', competitors: ['@glowrivalid', '@bersinarskin'] },
    { id: uid(), name: 'Bakso Juara', category: 'fnb', area: 'Bekasi & Depok', social: '@baksojuara.id',
      products: 'Bakso Beranak, Bakso Mercon level 1-5, Es Teler Juara', price: 'Rp12rb–28rb',
      usp: 'Kuah kaldu sapi asli 8 jam, tanpa MSG berlebih', proof: 'Antre tiap weekend, 4.8 di GoFood',
      buyer: 'Anak muda 16–26, pelajar & keluarga', painpoint: 'Budget tipis pengen makan enak, bosen menu itu-itu aja, takut zonk coba tempat baru', desire: 'Makan puas tanpa bikin dompet nangis',
      tone: 'Lucu & relatable', sapaan: 'gais', emoji: 'banyak', signature: 'juara di kuah pertama', forbidden: 'diet, menyehatkan',
      goal: 'Interaksi', cta: 'Order via GoFood/GrabFood', promo: 'Opening cabang Depok: diskon 20% s/d Jumat',
      forbiddenClaims: 'klaim sehat/diet', certifications: 'Halal',
      comp1: '@baksosebelahh', competitors: ['@baksosebelahh'] },
  ];
  seeds.forEach(s => { if (!list.some(x => x.name === s.name)) list.push(s); });
  saveClients(list);
  toast('2 brand contoh siap dipakai 🎁');
  renderHome();
}

/* ═══════════════════════ WORKSPACE ═══════════════════════ */
let currentId = null, currentTab = 'bikin', pickedType = 'script', pickedHook = '';
function openBrand(id, tab) {
  currentId = id; currentTab = tab || 'bikin';
  const c = getClient(id); if (!c) return renderHome();
  const app = $('#app'); app.innerHTML = '';
  const v = el('div', { class: 'view' });
  v.append(el('div', { class: 'row between' }, [
    el('button', { class: 'ghost', textContent: '← Semua brand', onclick: renderHome }),
  ]));
  v.append(el('div', { class: 'row', style: 'margin-top:10px;' }, [
    el('div', { class: 'avatar', textContent: (c.name || '?').charAt(0).toUpperCase() }),
    el('div', {}, [
      el('h2', { style: 'font-size:27px;', textContent: c.name }),
      el('div', { class: 'tiny', textContent: catOf(c).e + ' ' + catOf(c).label + (c.social ? ' · ' + c.social : '') }),
    ]),
  ]));
  const tabs = el('div', { class: 'tabs' });
  [['bikin', '✨ Bikin Konten'], ['riset', '🔍 Riset & Review'], ['profil', '👤 Profil Brand']].forEach(([id2, label]) => {
    tabs.append(el('button', { class: 'tab' + (currentTab === id2 ? ' on' : ''), textContent: label, onclick: () => openBrand(currentId, id2) }));
  });
  v.append(tabs);
  const body = el('div');
  v.append(body);
  app.append(v);
  if (currentTab === 'bikin') renderBikin(body, c);
  else if (currentTab === 'riset') renderRiset(body, c);
  else renderProfil(body, c);
  window.scrollTo({ top: 0 });
}
const stepLabel = (n, t) => el('div', { class: 'step-label' }, [el('span', { class: 'n', textContent: n }), t]);

/* ── TAB: BIKIN KONTEN ── */
function renderBikin(body, c) {
  body.append(stepLabel('1', 'Mau bikin apa?'));
  const grid = el('div', { class: 'type-grid' });
  Object.entries(TYPES).forEach(([id, t]) => {
    const card = el('div', { class: 'type-card' + (pickedType === id ? ' on' : '') }, [
      el('div', { class: 'e', textContent: t.e }), el('h4', { textContent: t.label }), el('p', { textContent: t.desc }),
    ]);
    card.onclick = () => { pickedType = id; grid.querySelectorAll('.type-card').forEach(x => x.classList.remove('on')); card.classList.add('on'); syncForm(); };
    grid.append(card);
  });
  body.append(grid);

  body.append(stepLabel('2', 'Topiknya apa? (boleh kosong)'));
  const form = el('div', { class: 'card' });
  const topic = el('input', { id: 'g_topic', type: 'text', placeholder: 'kosongin = kami pilihkan dari profil & promo brand-mu' });
  topic.onkeydown = e => { if (e.key === 'Enter') doGenerate(c); };
  form.append(topic);
  const bank = bankOf(c);
  const suggWrap = el('div', { class: 'sugg' });
  const topicSuggs = (c.promo ? [c.promo] : []).concat(bank.topics).slice(0, 6);
  topicSuggs.forEach(s => suggWrap.append(el('button', { textContent: s, onclick: e => { e.preventDefault(); topic.value = s; } })));
  form.append(suggWrap);

  // menu gaya hook (opsional): pilih satu tipe, generator pakai itu sebagai hook utama
  form.append(el('label', { textContent: '🪝 Gaya hook (opsional — pilih satu, sisanya kami atur)' }));
  const hookPills = el('div', { class: 'pills', id: 'g_hookmenu' });
  const setHook = id => { pickedHook = (pickedHook === id ? '' : id); hookPills.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', pickedHook && p.dataset.v === pickedHook)); };
  HOOK_MENU.forEach(([id, label]) => {
    const p = el('button', { class: 'pill' + (pickedHook === id ? ' on' : ''), textContent: label });
    p.dataset.v = id;
    p.title = (HOOKS.find(h => h.id === id) || {}).pattern || label;
    p.onclick = e => { e.preventDefault(); setHook(id); };
    hookPills.append(p);
  });
  form.append(hookPills);
  form.append(el('div', { class: 'hint', textContent: 'Nggak dipilih = kami pilihkan hook terbaik otomatis. Yang dipilih dipakai sebagai hook #1.' }));

  const mkPills = (id, label, opts, defIdx) => {
    const wrap = el('div', { id: id + '_wrap' });
    wrap.append(el('label', { textContent: label }));
    const pills = el('div', { class: 'pills', id });
    opts.forEach((g, i) => {
      const p = el('button', { class: 'pill' + (i === defIdx ? ' on' : ''), textContent: g });
      p.dataset.v = g;
      p.onclick = e => { e.preventDefault(); pills.querySelectorAll('.pill').forEach(x => x.classList.remove('on')); p.classList.add('on'); };
      pills.append(p);
    });
    wrap.append(pills);
    return wrap;
  };
  const goalDef = Math.max(0, GOALS.indexOf(c.goal));
  form.append(mkPills('g_goal', 'Tujuannya?', GOALS, goalDef));
  const pfWrap = mkPills('g_platform', 'Buat platform mana?', ['IG Reels', 'TikTok', 'IG Feed'], 0);
  form.append(pfWrap);
  const durWrap = mkPills('g_durasi', 'Durasi video', ['15 detik', '30 detik', '45 detik'], 1);
  form.append(durWrap);
  body.append(form);

  const goBar = el('div', { class: 'row', style: 'margin-top:18px;' });
  const goBtn = el('button', { class: 'primary big', id: 'btnGo', textContent: '✨ Bikinin sekarang!' });
  goBtn.onclick = () => doGenerate(c);
  goBar.append(goBtn);
  goBar.append(el('span', { class: 'tiny', textContent: 'gratis · instan · gaya ' + c.name }));
  body.append(goBar);
  body.append(el('div', { id: 'results' }));

  // riwayat generate (bisa dibuka ulang & dihapus)
  const histWrap = el('div', { id: 'histWrap', style: 'margin-top:28px;' });
  body.append(histWrap);
  renderHist(histWrap, c);

  function syncForm() {
    const video = pickedType === 'script' || pickedType === 'storyboard' || pickedType === 'paket';
    durWrap.style.display = (pickedType === 'script' || pickedType === 'storyboard') ? '' : 'none';
    pfWrap.style.display = video ? '' : 'none';
  }
  syncForm();
}
function collectDaily() {
  const pill = id => { const on = document.querySelector('#' + id + ' .pill.on'); return on ? on.dataset.v : ''; };
  return {
    topic: ($('#g_topic') || {}).value || '',
    goal: pill('g_goal'), platform: pill('g_platform'),
    durasi: ($('#g_durasi_wrap') && $('#g_durasi_wrap').style.display !== 'none') ? pill('g_durasi') : '',
    hook: pickedHook || '',
  };
}
function bumpSeed(c, type) {
  const seeds = store.get('ce3_seed_' + c.id, {});
  seeds[type] = (seeds[type] || 0) + 1;
  store.set('ce3_seed_' + c.id, seeds);
  return seeds[type];
}
function pushHist(c, type, title, daily, seed) {
  const hist = store.get('ce3_hist_' + c.id, []);
  hist.unshift({ id: 'h' + Date.now() + '-' + Math.floor(Math.random() * 1000), type, title, daily, seed });
  store.set('ce3_hist_' + c.id, hist.slice(0, 30));
  const w = $('#histWrap'); if (w) renderHist(w, c);
}
function delHist(c, id) { store.set('ce3_hist_' + c.id, store.get('ce3_hist_' + c.id, []).filter(h => h.id !== id)); }
function clearHist(c) { store.del('ce3_hist_' + c.id); }
function renderHist(container, c) {
  container.innerHTML = '';
  const hist = store.get('ce3_hist_' + c.id, []);
  if (!hist.length) return;
  container.append(el('div', { class: 'row between' }, [
    el('div', { class: 'tiny', style: 'font-weight:700;', textContent: '🕐 Riwayat hasil (' + hist.length + ') — buka lagi atau hapus' }),
    el('button', { class: 'ghost', style: 'font-size:12.5px; padding:6px 10px;', textContent: '🗑️ Hapus semua', onclick: () => { if (!confirm('Hapus semua riwayat ' + c.name + '?')) return; clearHist(c); renderHist(container, c); toast('Riwayat dikosongkan'); } }),
  ]));
  const list = el('div', { class: 'hist-list' });
  hist.forEach(h => {
    const t = TYPES[h.type] || {};
    list.append(el('div', { class: 'hist-item' }, [
      el('span', { class: 'e', textContent: t.e || '📄' }),
      el('div', { class: 't' }, [
        el('b', { textContent: h.title || t.label || h.type }),
        el('small', { textContent: (t.label || h.type) + (h.daily && h.daily.platform ? ' · ' + h.daily.platform : '') + (h.daily && h.daily.hook ? ' · hook: ' + h.daily.hook : '') }),
      ]),
      el('div', { class: 'acts' }, [
        el('button', { textContent: '↗️ Buka', onclick: () => {
          const data = TYPES[h.type].gen(c, h.daily, h.seed);
          $('#results').prepend(renderResult(h.type, data, c, h.daily, h.seed));
          const r = $('#results'); if (r) window.scrollTo({ top: r.offsetTop - 80, behavior: 'smooth' });
        } }),
        el('button', { class: 'del', textContent: '🗑️', title: 'Hapus dari riwayat', onclick: () => { delHist(c, h.id); renderHist(container, c); toast('Dihapus dari riwayat'); } }),
      ]),
    ]));
  });
  container.append(list);
}
const COOK_STEPS = ['Baca profil brand-mu…', 'Milih pola hook yang pas…', 'Nyusun struktur…', 'Nyocokin gaya bahasa…', 'Cek aturan aman…', 'Poles kalimat terakhir…'];
async function doGenerate(c) {
  const types = pickedType === 'paket' ? ['script', 'carousel', 'caption'] : [pickedType];
  const daily = collectDaily();
  const btn = $('#btnGo'), results = $('#results');
  btn.disabled = true;
  try {
    for (const type of types) {
      const cookBox = el('div', { class: 'card result-card' });
      const stepEl = el('div', { class: 'cook-step' });
      cookBox.append(el('div', { class: 'cooking' }, [
        el('div', { class: 'orb', textContent: TYPES[type].e }),
        el('div', {}, [el('b', { textContent: 'Lagi nyusun ' + TYPES[type].label + '…' }), stepEl]),
      ]));
      results.prepend(cookBox);
      const seed = bumpSeed(c, type);
      let prod;
      if (hasAI()) {
        // AI: tampilkan status "nanya ke AI" sambil menunggu balasan
        stepEl.textContent = '🤖 Nanya ke AI (' + aiResolvedModel() + ')… bisa 5–15 detik';
        prod = await produce(c, type, daily, seed);
      } else {
        const cookSteps = pickN(mulberry('cook' + Date.now()), COOK_STEPS, 3);
        for (const s of cookSteps) { stepEl.textContent = s; await sleep(380); }
        prod = await produce(c, type, daily, seed);
      }
      const data = prod.data;
      cookBox.replaceWith(renderResult(type, data, c, daily, seed));
      pushHist(c, type, data.title || data.concept || TYPES[type].label, daily, seed);
      toast(TYPES[type].label + (prod.viaAI ? ' jadi (AI) ✨' : ' jadi ✨'));
    }
  } finally { btn.disabled = false; }
}

/* ── FORMAT SALIN ── */
function fmtScript(d) {
  return ['🎬 SCRIPT ' + d.platform + ' · ±' + d.duration_sec + ' detik', '',
    'PILIHAN HOOK:', ...d.hooks.map((h, i) => (i + 1) + '. ' + h.text + '  [' + h.pattern + ']'), '',
    'ADEGAN:',
    ...d.scenes.map(s => `#${s.scene} (${s.duration_sec}s)\n  Visual: ${s.visual}\n  VO: ${s.voiceover}\n  Teks di layar: ${s.onscreen_text}`), '',
    'CTA: ' + d.cta, 'Sound: ' + d.sound_suggestion].join('\n');
}
function fmtCarousel(d) {
  return ['🎠 CAROUSEL: ' + d.title, '',
    ...d.slides.map(s => `SLIDE ${s.slide} [${s.role}]\n  ${s.headline}\n  ${s.subtext}\n  Visual: ${s.visual}`), '',
    'CAPTION:', d.caption, '', d.hashtags.join(' ')].join('\n');
}
function fmtCaption(d) {
  return ['✍️ CAPTION UTAMA:', d.caption_long, '', '— CAPTION PENDEK:', d.caption_short, '',
    '— HOOK CADANGAN:', ...d.hooks.map((h, i) => (i + 1) + '. ' + h), '', d.hashtags.join(' ')].join('\n');
}
function fmtStoryboard(d) {
  return ['🎥 STORYBOARD: ' + d.concept + ' · ±' + d.duration_sec + 's', '',
    ...d.shots.map(s => `SHOT ${s.shot} (${s.duration_sec}s)\n  Visual: ${s.visual}\n  Kamera: ${s.camera}\n  Talent/props: ${s.talent_props}\n  VO: ${s.voiceover}\n  Teks: ${s.onscreen_text}\n  Musik: ${s.sfx_music}`),
    '', 'B-ROLL: ' + d.broll.join(' · '), '', 'CATATAN: ' + d.production_notes].join('\n');
}
function fmtIdeas(d) {
  return ['🗓️ RENCANA SEMINGGU', '', ...d.ideas.map(i => `${i.day} · ${i.pillar} · ${i.format}\n  Hook: ${i.hook}\n  Konsep: ${i.concept}\n  CTA: ${i.cta}`)].join('\n\n');
}
const FMT = { script: fmtScript, carousel: fmtCarousel, caption: fmtCaption, storyboard: fmtStoryboard, ideas: fmtIdeas };

/* ── RENDER HASIL ── */
function resultShell(type, title, badgeText) {
  const t = TYPES[type] || { e: '📄', label: type };
  const card = el('div', { class: 'card result-card' });
  const head = el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: t.e }),
    el('h3', { textContent: title || t.label }),
    badgeText ? el('span', { class: 'badge pine', textContent: badgeText }) : null,
    el('span', { class: 'spacer' }),
    el('button', { class: 'result-close', title: 'Tutup / hapus hasil ini dari layar', textContent: '✕', onclick: () => { card.remove(); toast('Hasil ditutup'); } }),
  ]);
  card.append(head);
  return card;
}
function actionsBar(type, data, c, daily) {
  const bar = el('div', { class: 'row', style: 'margin-top:16px;' });
  bar.append(el('button', { class: 'primary', textContent: '📋 Salin semua', onclick: () => copyText(FMT[type](data), TYPES[type].label) }));
  bar.append(el('button', { textContent: '🎲 Versi lain', onclick: async e => {
    const btn = e.target; const card0 = btn.closest('.result-card');
    btn.disabled = true; btn.textContent = hasAI() ? '🤖 minta AI…' : '🎲 …';
    const seed = bumpSeed(c, type);
    const prod = await produce(c, type, daily, seed);
    pushHist(c, type, prod.data.title || prod.data.concept || TYPES[type].label, daily, seed);
    card0.replaceWith(renderResult(type, prod.data, c, daily, seed));
    toast(prod.viaAI ? 'Versi baru (AI) 🎲' : 'Versi baru 🎲');
  } }));
  return bar;
}
const learnBox = note => el('div', { class: 'learn', html: '<b>💡 Biar makin jago:</b> ' + note });
const copyChip = (text, label) => el('span', { class: 'chip copy', textContent: '📋 salin', onclick: () => copyText(text, label) });

function renderResult(type, data, c, daily, seed) {
  if (type === 'script') return renderScript(data, c, daily);
  if (type === 'carousel') return renderCarousel(data, c, daily);
  if (type === 'caption') return renderCaption(data, c, daily);
  if (type === 'storyboard') return renderStoryboard(data, c, daily);
  if (type === 'ideas') return renderIdeas(data, c, daily);
  return resultShell(type, 'Hmm, jenis ini belum ada');
}
function renderScript(d, c, daily) {
  const card = resultShell('script', d.title, d.platform + ' · ±' + d.duration_sec + 's');
  card.append(el('div', { class: 'tiny', style: 'margin:-6px 0 12px;', textContent: 'Formula: ' + d.frame }));
  card.append(el('b', { textContent: 'Pilih 1 dari 3 hook ini buat detik 0–3 (jadi kalimat pembuka Adegan #1):' }));
  const hookWrap = el('div', { style: 'display:flex; flex-direction:column; gap:10px; margin:10px 0 4px;' });
  d.hooks.forEach(h => hookWrap.append(el('div', { class: 'hook-opt' }, [
    el('div', { class: 'row between' }, [el('span', { class: 'badge coral', textContent: h.pattern }), copyChip(h.text, 'Hook')]),
    el('b', { class: 'h', textContent: h.text }),
    el('div', { class: 'why', textContent: 'Kenapa works: ' + h.why }),
  ])));
  card.append(hookWrap);
  card.append(el('div', { class: 'divider' }));
  card.append(el('b', { textContent: 'Adegan (tinggal ikutin pas shoot):' }));
  const tl = el('div', { class: 'timeline' });
  let t0 = 0;
  d.scenes.forEach(s => {
    tl.append(el('div', { class: 'beat' }, [
      el('div', { class: 't', textContent: t0 + '–' + (t0 + s.duration_sec) + 's' }),
      el('div', {}, [
        el('div', { class: 'vis', html: '<b>🎥 Visual:</b> ' + s.visual }),
        el('div', { class: 'vo', textContent: '🗣️ ' + s.voiceover }),
        s.onscreen_text ? el('span', { class: 'ost', textContent: s.onscreen_text }) : null,
      ]),
    ]));
    t0 += s.duration_sec;
  });
  card.append(tl);
  card.append(el('div', { class: 'row', style: 'margin-top:14px;' }, [
    el('span', { class: 'chip', textContent: '📣 CTA: ' + d.cta }),
    el('span', { class: 'chip', textContent: '🎵 ' + d.sound_suggestion.split('—')[0].trim() }),
    el('span', { class: 'chip', textContent: '🛡️ ' + d.compliance_notes.split(':')[0] }),
  ]));
  card.append(learnBox(d.learning_note));
  { const ig = igExtras('script', d, c, daily); if (ig) card.append(ig); }
  card.append(actionsBar('script', d, c, daily));
  return card;
}
function renderCarousel(d, c, daily) {
  const card = resultShell('carousel', d.title, d.slides.length + ' slide');
  let idx = 0;
  const phone = el('div', { class: 'phone' });
  const dots = el('div', { class: 'car-dots' });
  const listWrap = el('div', { class: 'slide-list' });
  function showSlide(i) {
    idx = (i + d.slides.length) % d.slides.length;
    const s = d.slides[idx];
    phone.innerHTML = '';
    phone.append(el('div', { class: 'slide-inner' }, [
      el('span', { class: 's-brand', textContent: '@' + slugTag(c.name) }),
      el('span', { class: 's-role', textContent: 'Slide ' + s.slide + ' · ' + s.role }),
      el('div', { class: 's-head', textContent: s.headline }),
      el('div', { class: 's-sub', textContent: s.subtext }),
      el('div', { class: 's-vis', textContent: '🎨 ' + s.visual }),
    ]));
    dots.innerHTML = '';
    d.slides.forEach((_, j) => dots.append(el('i', { class: j === idx ? 'on' : '' })));
    listWrap.querySelectorAll('.slide-row').forEach((r, j) => r.classList.toggle('on', j === idx));
  }
  d.slides.forEach((s, j) => {
    listWrap.append(el('div', { class: 'slide-row', onclick: () => showSlide(j) }, [
      el('span', { class: 'no', textContent: s.slide }),
      el('div', {}, [el('b', { textContent: s.headline }), el('span', { textContent: s.subtext.split('\n')[0] })]),
    ]));
  });
  const left = el('div', {}, [
    phone,
    el('div', { class: 'car-nav' }, [
      el('button', { textContent: '←', onclick: () => showSlide(idx - 1) }),
      dots,
      el('button', { textContent: '→', onclick: () => showSlide(idx + 1) }),
    ]),
  ]);
  card.append(el('div', { class: 'car-wrap' }, [left, listWrap]));
  showSlide(0);
  card.append(el('div', { class: 'divider' }));
  card.append(el('div', { class: 'row between' }, [el('b', { textContent: 'Alternatif judul cover:' })]));
  card.append(el('div', { class: 'row', style: 'margin-top:8px;' }, d.cover_alternatives.map(cv => el('span', { class: 'chip copy', textContent: cv, onclick: () => copyText(cv, 'Judul cover') }))));
  card.append(el('div', { class: 'row between', style: 'margin-top:16px;' }, [el('b', { textContent: 'Caption:' }), copyChip(d.caption + '\n\n' + d.hashtags.join(' '), 'Caption')]));
  card.append(el('div', { class: 'copybox', style: 'margin-top:8px;', textContent: d.caption }));
  card.append(el('div', { class: 'row', style: 'margin-top:10px;' },
    [...d.hashtags.map(h => el('span', { class: 'chip', textContent: h })), el('span', { class: 'chip copy', textContent: '📋 salin hashtag', onclick: () => copyText(d.hashtags.join(' '), 'Hashtag') })]));
  card.append(learnBox(d.learning_note));
  { const ig = igExtras('carousel', d, c, daily); if (ig) card.append(ig); }
  card.append(actionsBar('carousel', d, c, daily));
  return card;
}
function renderCaption(d, c, daily) {
  const card = resultShell('caption', 'Caption + Hashtag', d.formula);
  card.append(el('div', { class: 'row between' }, [el('b', { textContent: 'Caption utama:' }), copyChip(d.caption_long + '\n\n' + d.hashtags.join(' '), 'Caption')]));
  card.append(el('div', { class: 'copybox', style: 'margin-top:8px;', textContent: d.caption_long }));
  card.append(el('div', { class: 'row between', style: 'margin-top:16px;' }, [el('b', { textContent: 'Versi pendek (story / TikTok):' }), copyChip(d.caption_short, 'Caption pendek')]));
  card.append(el('div', { class: 'copybox', style: 'margin-top:8px;', textContent: d.caption_short }));
  card.append(el('b', { style: 'display:block; margin-top:16px;', textContent: '5 hook cadangan (buat variasi post berikutnya):' }));
  const ul = el('ul', { class: 'clean num' });
  (d.hook_details || d.hooks.map(h => ({ text: h, pattern: '' }))).forEach(h => {
    const li = el('li', {}, [
      el('div', { class: 'row between' }, [
        el('span', { textContent: h.text }),
        el('span', { class: 'row', style: 'gap:6px;' }, [h.pattern ? el('span', { class: 'badge coral', textContent: h.pattern }) : null, copyChip(h.text, 'Hook')]),
      ]),
    ]);
    ul.append(li);
  });
  card.append(ul);
  card.append(el('div', { class: 'row', style: 'margin-top:12px;' },
    [...d.hashtags.map(h => el('span', { class: 'chip', textContent: h })), el('span', { class: 'chip copy', textContent: '📋 salin hashtag', onclick: () => copyText(d.hashtags.join(' '), 'Hashtag') })]));
  card.append(learnBox(d.learning_note));
  { const ig = igExtras('caption', d, c, daily); if (ig) card.append(ig); }
  card.append(actionsBar('caption', d, c, daily));
  return card;
}
function renderStoryboard(d, c, daily) {
  const card = resultShell('storyboard', d.concept, '±' + d.duration_sec + 's');
  const tbl = el('table', { class: 't' });
  tbl.append(el('thead', {}, el('tr', {}, ['#', 'Visual & kamera', 'VO / teks di layar', 'Musik', 'Durasi'].map(h => el('th', { textContent: h })))));
  const tb = el('tbody');
  d.shots.forEach(s => tb.append(el('tr', {}, [
    el('td', { textContent: s.shot }),
    el('td', { html: s.visual + '<br/><span class="tiny">📷 ' + s.camera + ' · 🎭 ' + s.talent_props + '</span>' }),
    el('td', { html: s.voiceover + (s.onscreen_text ? '<br/><span class="tiny">💬 ' + s.onscreen_text + '</span>' : '') }),
    el('td', { class: 'tiny', textContent: s.sfx_music }),
    el('td', { textContent: s.duration_sec + 's' }),
  ])));
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  card.append(el('b', { style: 'display:block; margin-top:16px;', textContent: 'Stok b-roll (rekam ekstra ini, kepakai terus):' }));
  card.append(el('div', { class: 'row', style: 'margin-top:8px;' }, d.broll.map(b => el('span', { class: 'chip', textContent: '🎞️ ' + b }))));
  card.append(el('div', { class: 'copybox', style: 'margin-top:14px;', textContent: '📝 ' + d.production_notes }));
  card.append(learnBox(d.learning_note));
  { const ig = igExtras('storyboard', d, c, daily); if (ig) card.append(ig); }
  card.append(actionsBar('storyboard', d, c, daily));
  return card;
}
function renderIdeas(d, c, daily) {
  const card = resultShell('ideas', 'Rencana konten seminggu', '80% memberi · 20% jualan');
  const week = el('div', { class: 'week' });
  d.ideas.forEach(i => week.append(el('div', { class: 'day-card' }, [
    el('div', { class: 'row between' }, [
      el('span', { class: 'd', textContent: i.day }),
      el('span', { class: 'badge ' + (i.pillar === 'Promosi' ? 'coral' : 'pine'), textContent: i.pillar }),
    ]),
    el('b', { class: 'h', textContent: i.hook }),
    el('div', { class: 'c', textContent: i.concept }),
    el('div', { class: 'row between', style: 'margin-top:auto;' }, [
      el('span', { class: 'chip', textContent: i.format }),
      el('span', { class: 'tiny', textContent: '📣 ' + (i.cta.length > 30 ? i.cta.slice(0, 28) + '…' : i.cta) }),
    ]),
  ])));
  card.append(week);
  card.append(learnBox(d.learning_note));
  card.append(actionsBar('ideas', d, c, daily));
  return card;
}

/* ── TAB: RISET & REVIEW ── */
function renderRiset(body, c) {
  const saved = store.get('ce3_riset_' + c.id, {});
  const persist = () => store.set('ce3_riset_' + c.id, saved);

  // ── review akun sendiri
  const revCard = el('div', { class: 'card' });
  revCard.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🩺' }),
    el('h3', { textContent: 'Review akun ' + (c.social || 'IG-mu') }),
  ]));
  revCard.append(el('p', { class: 'muted', style: 'margin:0 0 12px; font-size:14px;', html: 'Buka profil IG-mu → salin caption <b>5–10 post terakhir</b> → tempel di bawah. Pisahkan tiap caption dengan baris berisi <b>---</b> (tiga strip). Kami analisis hook, CTA, hashtag, keterbacaan & variasinya — beneran dihitung, bukan pujian kosong.' }));
  const revTa = el('textarea', { style: 'min-height:150px;', placeholder: 'Caption post 1…\n---\nCaption post 2…\n---\nCaption post 3…', value: saved.myPosts || '' });
  revTa.oninput = () => { saved.myPosts = revTa.value; persist(); };
  revCard.append(revTa);
  const revOut = el('div');
  revCard.append(el('div', { class: 'row', style: 'margin-top:14px;' }, [
    el('button', { class: 'primary', textContent: '🩺 Analisis sekarang', onclick: () => {
      const rep = reviewReport(c, revTa.value);
      revOut.innerHTML = '';
      if (rep.error) { toast(rep.error.split('.')[0]); revOut.append(el('div', { class: 'learn', textContent: rep.error })); return; }
      revOut.append(renderReview(rep));
      revOut.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } }),
    el('span', { class: 'tiny', textContent: 'nggak dikirim ke mana-mana — dianalisis di browser kamu' }),
  ]));
  body.append(revCard);
  body.append(revOut);

  // ── bandingkan kompetitor
  const cmpCard = el('div', { class: 'card', style: 'margin-top:18px;' });
  cmpCard.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🥊' }),
    el('h3', { textContent: 'Bandingkan dengan kompetitor' }),
  ]));
  cmpCard.append(el('p', { class: 'muted', style: 'margin:0 0 12px; font-size:14px;', html: 'Tempel caption kompetitormu (5–10 post per akun, pisahkan dengan <b>---</b>). Kami bandingkan pola mereka vs kamu, terus carikan celah yang bisa kamu menangkan.' }));
  cmpCard.append(el('label', { textContent: 'Caption akun kamu (opsional — otomatis ambil dari kolom review di atas)' }));
  const compsWrap = el('div');
  saved.comps = Array.isArray(saved.comps) && saved.comps.length ? saved.comps : [{ handle: c.comp1 || c.competitors && c.competitors[0] || '', raw: '' }];
  function drawComps() {
    compsWrap.innerHTML = '';
    saved.comps.forEach((cp, i) => {
      const box = el('div', { style: 'margin-top:14px;' });
      box.append(el('label', { textContent: 'Kompetitor ' + (i + 1) }));
      const h = el('input', { type: 'text', placeholder: '@handle_kompetitor', value: cp.handle || '', style: 'margin-bottom:8px;' });
      h.oninput = () => { cp.handle = h.value; persist(); };
      const ta = el('textarea', { style: 'min-height:110px;', placeholder: 'Tempel caption mereka di sini…\n---\ncaption berikutnya…', value: cp.raw || '' });
      ta.oninput = () => { cp.raw = ta.value; persist(); };
      box.append(h); box.append(ta);
      compsWrap.append(box);
    });
  }
  drawComps();
  cmpCard.append(compsWrap);
  const cmpOut = el('div');
  cmpCard.append(el('div', { class: 'row', style: 'margin-top:14px;' }, [
    el('button', { class: 'primary', textContent: '🥊 Bandingkan!', onclick: () => {
      const comps = saved.comps.filter(cp => cp.raw && parsePosts(cp.raw).length >= 2)
        .map(cp => ({ handle: (cp.handle || '@kompetitor').trim(), raw: cp.raw }));
      if (!comps.length) { toast('Isi dulu caption kompetitor (minimal 2 post) ya'); return; }
      const rep = compareReport(c, saved.myPosts || '', comps);
      cmpOut.innerHTML = '';
      cmpOut.append(renderCompare(rep, c));
      cmpOut.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } }),
    saved.comps.length < 3 ? el('button', { textContent: '＋ Tambah kompetitor', onclick: () => { saved.comps.push({ handle: '', raw: '' }); persist(); drawComps(); } }) : null,
  ]));
  body.append(cmpCard);
  body.append(cmpOut);
}
function scoreMeter(label, score, note) {
  const cls = score < 5 ? 'low' : score < 7.5 ? 'mid' : '';
  return el('div', { class: 'meter-row' }, [
    el('div', {}, [el('div', { class: 'meter-label', textContent: label }), note ? el('div', { class: 'tiny', textContent: note }) : null]),
    el('div', { class: 'meter' }, el('i', { class: cls, style: 'width:' + (score * 10) + '%;' })),
    el('div', { class: 'score-num', textContent: score }),
  ]);
}
function renderReview(d) {
  const card = el('div', { class: 'card result-card' });
  card.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🩺' }),
    el('h3', { textContent: 'Hasil review — ' + d.n + ' post dianalisis' }),
  ]));
  card.append(el('div', { class: 'hero-score' }, [
    el('span', { class: 'n', style: d.overall < 5 ? 'color:var(--coral-dark);' : d.overall < 7.5 ? 'color:var(--gold);' : 'color:var(--pine);', textContent: d.overall }),
    el('span', { class: 'd', textContent: '/ 10' }),
  ]));
  const meters = el('div', { style: 'margin-top:12px;' });
  d.scores.forEach(s => meters.append(scoreMeter(s.aspect, s.score, s.note)));
  card.append(meters);
  card.append(el('div', { class: 'divider' }));
  card.append(el('b', { textContent: 'Per post (baris pertama = hook kamu):' }));
  const tbl = el('table', { class: 't' });
  tbl.append(el('thead', {}, el('tr', {}, ['#', 'Baris pertama', 'Hook', 'Pola', 'CTA', 'Tag', 'Jenis'].map(h => el('th', { textContent: h })))));
  const tb = el('tbody');
  d.perPost.forEach(p => tb.append(el('tr', {}, [
    el('td', { textContent: p.no }),
    el('td', { textContent: p.firstLine.slice(0, 52) + (p.firstLine.length > 52 ? '…' : '') }),
    el('td', { html: '<b>' + p.hook + '</b>/10' }),
    el('td', { class: 'tiny', textContent: p.pattern }),
    el('td', { textContent: p.hasCTA ? '✓' : '✗' }),
    el('td', { textContent: p.tags }),
    el('td', { class: 'tiny', textContent: p.pillar }),
  ])));
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  const sec = (title, cls, items) => { if (!items.length) return; card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: title })); const ul = el('ul', { class: 'clean ' + cls }); items.forEach(i => ul.append(el('li', { textContent: i }))); card.append(ul); };
  sec('Yang udah bagus:', 'good', d.strengths);
  sec('Yang bocor:', 'bad', d.weaknesses);
  sec('Rekomendasi:', 'num', d.recommendations);
  sec('Quick wins minggu ini:', 'idea', d.quick_wins);
  card.append(learnBox(d.learning_note));
  return card;
}
function renderCompare(d, c) {
  const card = el('div', { class: 'card result-card' });
  card.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🥊' }),
    el('h3', { textContent: 'Kamu vs kompetitor' }),
  ]));
  const tbl = el('table', { class: 't' });
  const cols = [{ label: c.name + ' (kamu)', a: d.mine }].concat(d.competitors.map(cp => ({ label: cp.handle, a: cp.scores })));
  tbl.append(el('thead', {}, el('tr', {}, [el('th', { textContent: 'Aspek' })].concat(cols.map(col => el('th', { textContent: col.label }))))));
  const tb = el('tbody');
  const rows = [
    ['Skor total', a => a ? a.overall : '—'],
    ['Hook 3 detik', a => a ? a.hookScore : '—'],
    ['CTA', a => a ? Math.round(a.ctaCoverage * 100) + '%' : '—'],
    ['Hashtag (median)', a => a ? a.medianTags : '—'],
    ['Porsi jualan', a => a ? Math.round(a.promoShare * 100) + '%' : '—'],
  ];
  rows.forEach(([label, fn]) => tb.append(el('tr', {}, [el('td', { html: '<b>' + label + '</b>' })].concat(cols.map(col => el('td', { textContent: String(fn(col.a)) }))))));
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  if (!d.mine) card.append(el('div', { class: 'hint', style: 'margin-top:8px;', textContent: 'Kolom kamu kosong? Isi caption-mu di bagian review di atas, terus bandingkan lagi.' }));
  d.competitors.forEach(cp => {
    card.append(el('div', { class: 'divider' }));
    card.append(el('div', { class: 'row between' }, [
      el('b', { style: 'font-size:16px;', textContent: cp.handle }),
      el('span', { class: 'chip', textContent: cp.n + ' post · skor ' + cp.overall }),
    ]));
    card.append(el('div', { class: 'tiny', style: 'margin-top:6px;', textContent: 'Pola hook mereka: ' + cp.hook_patterns.join(' · ') }));
    const ul1 = el('ul', { class: 'clean good' }); cp.tiru_adaptasi.forEach(t => ul1.append(el('li', { textContent: 'Tiru-adaptasi: ' + t }))); card.append(ul1);
    const ul2 = el('ul', { class: 'clean bad' }); cp.kelemahan.forEach(t => ul2.append(el('li', { textContent: t }))); card.append(ul2);
  });
  if (d.gaps.length) {
    card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: '🕳️ Celah yang belum digarap siapa pun:' }));
    const ul = el('ul', { class: 'clean idea' }); d.gaps.forEach(g => ul.append(el('li', { textContent: g }))); card.append(ul);
  }
  card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: '🪝 Bank hook siap pakai (udah pakai voice ' + c.name + '):' }));
  const hb = el('ul', { class: 'clean num' });
  d.hook_bank.forEach(h => {
    const [text, pat] = h.split('  ·  ');
    hb.append(el('li', {}, [el('div', { class: 'row between' }, [el('span', { textContent: text }), el('span', { class: 'row', style: 'gap:6px;' }, [el('span', { class: 'badge coral', textContent: (pat || '').replace(/[()]/g, '') }), copyChip(text, 'Hook')])])]));
  });
  card.append(hb);
  card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: '🎯 5 langkah buat menang:' }));
  const ai = el('ul', { class: 'clean num' }); d.action_ideas.forEach(a => ai.append(el('li', { textContent: a }))); card.append(ai);
  card.append(learnBox(d.learning_note));
  return card;
}

/* ── TAB: PROFIL ── */
const WIZ_INDEX = {}; WIZ_STEPS.forEach((s, i) => s.fields.forEach(f => { WIZ_INDEX[f.id] = i; }));
function renderProfil(body, c) {
  const pct = profileStrength(c);
  const head = el('div', { class: 'card' });
  head.append(el('div', { class: 'row between' }, [
    el('b', { textContent: 'Kekuatan profil — makin lengkap, makin tajam hasilnya' }),
    el('button', { textContent: '✏️ Edit profil', onclick: () => startWizard(c, 0) }),
  ]));
  head.append(strengthBar(pct));
  body.append(head);
  const groups = [
    ['🛍️ Produk & harga', ['products', 'price', 'usp', 'proof'], 'produk'],
    ['🎯 Pembeli', ['buyer', 'painpoint', 'desire'], 'pembeli'],
    ['🗣️ Gaya bicara', ['tone', 'sapaan', 'emoji', 'signature', 'forbidden', 'brandGuide'], 'gaya'],
    ['📣 Tujuan & promo', ['goal', 'cta', 'promo'], 'tujuan'],
    ['🛡️ Aturan aman', ['forbiddenClaims', 'certifications'], 'aman'],
    ['🔭 Sosmed & saingan', ['social', 'comp1', 'comp2', 'comp3'], 'saingan'],
  ];
  const LABELS = { products: 'Andalan', price: 'Harga', usp: 'Pembeda', proof: 'Bukti', buyer: 'Pembeli', painpoint: 'Masalah mereka', desire: 'Impian mereka', tone: 'Nada', sapaan: 'Sapaan', emoji: 'Emoji', signature: 'Frasa khas', forbidden: 'Kata terlarang', brandGuide: 'Brand guideline', goal: 'Tujuan', cta: 'CTA', promo: 'Promo', forbiddenClaims: 'Klaim dilarang', certifications: 'Sertifikasi', social: 'IG', comp1: 'Kompetitor 1', comp2: 'Kompetitor 2', comp3: 'Kompetitor 3' };
  const fmtVal = k => k === 'brandGuide' ? ('📄 ' + (c.brandGuideName || 'PDF') + ' (' + String(c.brandGuide).length + ' karakter)') : (Array.isArray(c[k]) ? c[k].join(' · ') : String(c[k]));
  groups.forEach(([title, keys, stepId]) => {
    const filled = keys.filter(k => c[k] && String(c[k]).trim());
    const g = el('div', { class: 'card', style: 'margin-top:14px;' });
    g.append(el('div', { class: 'row between' }, [
      el('b', { textContent: title }),
      el('button', { class: 'ghost', textContent: filled.length ? '✏️ ubah' : '＋ isi (biar makin tajam)', onclick: () => startWizard(c, WIZ_STEPS.findIndex(s => s.id === stepId)) }),
    ]));
    if (filled.length) {
      const dl = el('div', { style: 'margin-top:10px; display:flex; flex-direction:column; gap:6px;' });
      filled.forEach(k => dl.append(el('div', { style: 'font-size:14px;' }, [
        el('b', { textContent: LABELS[k] + ': ' }), fmtVal(k),
      ])));
      g.append(dl);
    } else g.append(el('div', { class: 'hint', style: 'margin-top:8px;', textContent: 'Belum diisi — bagian ini bikin hasil makin personal.' }));
    body.append(g);
  });
  const danger = el('div', { class: 'card', style: 'margin-top:14px;' });
  danger.append(el('div', { class: 'row between' }, [
    el('div', {}, [el('b', { textContent: 'Hapus brand ini' }), el('div', { class: 'hint', textContent: 'Profil + riwayat hasil ikut terhapus. Nggak bisa dibalikin.' })]),
    el('button', { class: 'danger', textContent: '🗑️ Hapus', onclick: () => {
      if (!confirm('Yakin hapus ' + c.name + '? Semua riwayatnya ikut hilang.')) return;
      deleteClient(c.id); toast('Brand dihapus'); renderHome();
    } }),
  ]));
  body.append(danger);
}

/* ═══════════════════════ SETTINGS DIALOG ═══════════════════════ */
function refreshModeBadge() {
  const b = $('#modeBadge');
  if (hasAI()) {
    b.className = 'badge coral'; b.textContent = '🤖 AI aktif';
    b.title = 'Model: ' + aiResolvedModel() + ' — hasil disempurnakan AI, fallback ke lokal kalau gagal';
  } else {
    b.className = 'badge pine'; b.textContent = '⚡ instan';
    b.title = 'Mode: mesin lokal (instan & privat). Isi kunci di ⚙️ untuk pakai AI.';
  }
}
function openSettings() {
  $('#inpKey').value = aiKey();
  $('#inpSpeed').value = aiSpeed();
  $('#inpModel').value = aiModelManual();
  const dlg = $('#dlgSettings'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function closeSettings() { const dlg = $('#dlgSettings'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
$('#btnSettings').onclick = openSettings;
$('#btnCloseSettings').onclick = closeSettings;
$('#btnSaveSettings').onclick = () => {
  store.set('ce3_key', $('#inpKey').value.trim());
  store.set('ce3_speed', $('#inpSpeed').value);
  store.set('ce3_model', $('#inpModel').value.trim());
  refreshModeBadge();
  closeSettings();
  toast(hasAI() ? '🤖 AI aktif — model: ' + aiResolvedModel() : '⚡ Mode lokal (instan)');
};

/* ═══════════════════════ BOOT ═══════════════════════ */
$('#logoHome').onclick = () => { wiz = null; renderHome(); };
refreshModeBadge();
renderHome();
