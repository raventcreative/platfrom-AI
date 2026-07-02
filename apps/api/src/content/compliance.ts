import { BrandCategory } from '@prisma/client';

/**
 * Aturan compliance per vertikal ({{COMPLIANCE_FOCUS}}).
 * Sumber: Content Engine Handbook §7.
 */

const SKINCARE = `COMPLIANCE SKINCARE (WAJIB - aturan BPOM): Kosmetik hanya klaim PENAMPILAN, BUKAN menyembuhkan penyakit. DILARANG: "menyembuhkan/obat", "memutihkan", "menghilangkan permanen", superlatif (paling/ter-/nomor 1/100%/terbaik), persona dokter/jas lab. GANTI dgn kata aman: "membantu merawat/menyamarkan tampilan/mencerahkan", "kulit TAMPAK/TERASA lebih...". Hanya produk ber-BPOM. Jangan glorifikasi merkuri/hidrokuinon/tretinoin/steroid. Kata aman: membantu, menjaga, merawat, menyamarkan tampilan, tampak/terlihat lebih..., terasa.`;

const FNB = `COMPLIANCE F&B (WAJIB): selalu sebut channel order (GoFood/GrabFood/ShopeeFood/dine-in) + lokasi/jam + harga transparan + status halal kalau ada. Hindari klaim sehat/medis tanpa dasar.`;

const UMUM = `COMPLIANCE UMUM: hindari overclaim, scarcity palsu, testimoni palsu. Sebut harga/varian/cara beli jelas. SEMUA: hindari SARA, body shaming/colorism, menjelekkan kompetitor. Inklusif & jujur. Jangan ngarang fakta/angka di luar profil (tandai [PERLU DIISI: ...]).`;

export function complianceFocus(category: BrandCategory): string {
  switch (category) {
    case 'SKINCARE':
      return `${SKINCARE}\n\n${UMUM}`;
    case 'FNB':
      return `${FNB}\n\n${UMUM}`;
    default:
      return UMUM;
  }
}
