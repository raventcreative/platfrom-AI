/**
 * Prisma seed script: mengisi DB dengan data demo (org, user, brand contoh)
 * agar aplikasi bisa langsung dicoba tanpa input manual.
 */
import { BrandCategory, Platform, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Organisasi demo — upsert agar seed idempoten (aman dijalankan berulang).
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-0001' },
    update: {},
    create: { id: 'seed-org-0001', name: 'ProdPilot Studio', plan: 'AGENCY' },
  });

  // User demo beserta apiToken statis untuk otentikasi di lingkungan dev.
  const user = await prisma.user.upsert({
    where: { email: 'demo@prodpilot.local' },
    update: {},
    create: {
      orgId: org.id,
      email: 'demo@prodpilot.local',
      name: 'Demo Operator',
      role: 'OWNER',
      apiToken: 'dev-token-123',
    },
  });

  // Cek brand contoh; hanya dibuat jika belum ada (findFirst tak mendukung upsert komposit).
  const existing = await prisma.brand.findFirst({
    where: { orgId: org.id, name: 'Glow Serum' },
  });

  // Brand demo lengkap dengan voice profile & brand kit.
  const brand =
    existing ??
    (await prisma.brand.create({
      data: {
        orgId: org.id,
        name: 'Glow Serum',
        niche: 'Skincare / Beauty',
        description: 'Serum Vitamin C untuk wanita 25-35.',
        category: BrandCategory.SKINCARE,
        platforms: [Platform.INSTAGRAM, Platform.TIKTOK],
        profile: {
          'Produk unggulan': 'Serum Vitamin C, Sunscreen SPF50',
          'Range harga': 'Rp79k–145k',
          'Target audience': 'Wanita 25-35, profesional muda',
          'Pain point audiens': 'Kulit kusam, takut produk abal-abal',
          Sapaan: 'kak',
          'Signature phrase': 'glow tiap hari bareng Glow Serum',
          CTA: 'checkout link bio',
          'Status izin': 'BPOM terdaftar',
        },
        voiceProfile: {
          create: {
            toneAttributes: ['fresh', 'premium', 'meyakinkan'],
            styleSummary:
              'Bahasa hangat, percaya diri, fokus manfaat nyata tanpa over-promise.',
            preferredWords: ['glowing', 'aman', 'teruji'],
            avoidWords: ['ajaib', 'instan'],
            status: 'READY',
          },
        },
        kit: {
          create: {
            colors: ['#F5A623', '#FFFFFF', '#2D2D2D'],
            fonts: ['Poppins', 'Inter'],
            guidelines: 'Nuansa cerah, bersih, sentuhan emas lembut.',
          },
        },
      },
    }));

  console.log('Seed selesai.');
  console.log('  Org        :', org.name, `(${org.id})`);
  console.log('  API token  :', user.apiToken);
  console.log('  Brand id   :', brand.id, `(${brand.name})`);
}

// Jalankan seed; keluar dengan kode error bila gagal, dan selalu tutup koneksi.
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
