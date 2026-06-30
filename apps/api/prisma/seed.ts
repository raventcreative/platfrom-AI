import { Platform, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-0001' },
    update: {},
    create: { id: 'seed-org-0001', name: 'ProdPilot Studio', plan: 'AGENCY' },
  });

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

  const existing = await prisma.brand.findFirst({
    where: { orgId: org.id, name: 'Glow Serum' },
  });

  const brand =
    existing ??
    (await prisma.brand.create({
      data: {
        orgId: org.id,
        name: 'Glow Serum',
        niche: 'Skincare / Beauty',
        description: 'Serum Vitamin C untuk wanita 25-35.',
        platforms: [Platform.INSTAGRAM, Platform.TIKTOK],
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
