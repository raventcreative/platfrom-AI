import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BrandCategory, JobAgent, Platform, Prisma } from '@prisma/client';
import { AuthContext } from '../auth/auth.decorator';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { TrainVoiceDto } from './dto/train-voice.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

const CATEGORY_MAP: Record<string, BrandCategory> = {
  skincare: BrandCategory.SKINCARE,
  fnb: BrandCategory.FNB,
  fashion: BrandCategory.FASHION,
  service: BrandCategory.SERVICE,
  other: BrandCategory.OTHER,
};

/** Logika bisnis brand — semua query/mutasi dibatasi org milik pemanggil. */
@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  /** Daftar brand aktif milik org (terbaru dulu), termasuk kompetitornya. */
  list(auth: AuthContext) {
    return this.prisma.brand.findMany({
      where: { orgId: auth.orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { competitors: true },
    });
  }

  /** Buat brand baru + sinkronkan daftar kompetitor (bila dikirim). */
  async create(auth: AuthContext, dto: CreateBrandDto) {
    const brand = await this.prisma.brand.create({
      data: {
        orgId: auth.orgId,
        name: dto.name,
        niche: dto.niche,
        description: dto.description,
        category: dto.category ? CATEGORY_MAP[dto.category] : BrandCategory.OTHER,
        platforms: mapPlatforms(dto.platforms),
        profile: (dto.profile ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    if (dto.competitors) await this.syncCompetitors(brand.id, dto.competitors);
    return this.get(auth, brand.id);
  }

  /** Update parsial — hanya field yang dikirim yang diubah. */
  async update(auth: AuthContext, id: string, dto: UpdateBrandDto) {
    await this.assertOwned(auth, id);
    await this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.niche !== undefined ? { niche: dto.niche } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined
          ? { category: CATEGORY_MAP[dto.category] }
          : {}),
        ...(dto.platforms !== undefined
          ? { platforms: mapPlatforms(dto.platforms) }
          : {}),
        ...(dto.profile !== undefined
          ? { profile: dto.profile as Prisma.InputJsonValue }
          : {}),
      },
    });
    if (dto.competitors !== undefined) {
      await this.syncCompetitors(id, dto.competitors ?? []);
    }
    return this.get(auth, id);
  }

  /**
   * Hapus brand (soft-delete): status='archived' — hilang dari daftar,
   * riwayat generate/insight tetap tersimpan untuk audit.
   */
  async remove(auth: AuthContext, id: string) {
    await this.assertOwned(auth, id);
    await this.prisma.brand.update({
      where: { id },
      data: { status: 'archived' },
    });
    return { ok: true };
  }

  /** Detail brand + relasi; tolak bila bukan milik org pemanggil. */
  async get(auth: AuthContext, id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { voiceProfile: true, kit: true, competitors: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
    return brand;
  }

  /** Ganti seluruh daftar kompetitor brand dengan daftar handle baru. */
  private async syncCompetitors(brandId: string, handles: string[]) {
    const clean = handles
      .map((h) => h.replace(/^@/, '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);
    await this.prisma.$transaction([
      this.prisma.competitor.deleteMany({ where: { brandId } }),
      ...(clean.length
        ? [
            this.prisma.competitor.createMany({
              data: clean.map((handle) => ({
                brandId,
                handle,
                platform: Platform.INSTAGRAM,
              })),
            }),
          ]
        : []),
    ]);
  }

  /**
   * "Training" brand voice: antrikan job BRANDVOICE yang mengambil konten IG
   * (scrape) dan/atau contoh caption manual, lalu menyimpan voice profile.
   */
  async trainVoice(auth: AuthContext, id: string, dto: TrainVoiceDto) {
    const brand = await this.get(auth, id); // sekaligus cek kepemilikan org
    const samples = (dto.samples ?? []).filter((s) => s.trim());
    if (!dto.igHandle?.trim() && !samples.length) {
      throw new BadRequestException(
        'Isi igHandle (mis. "@brandku") atau samples (contoh caption).',
      );
    }
    const job = await this.jobs.createAndEnqueue(brand.id, JobAgent.BRANDVOICE, {
      igHandle: dto.igHandle?.trim() || undefined,
      samples,
    });
    return { jobId: job.id, status: job.status };
  }

  /** Helper guard: verifikasi brand ada & dimiliki org, atau lempar 404/403. */
  private async assertOwned(auth: AuthContext, id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
    return brand;
  }
}

// Konversi daftar platform string DTO ke enum Platform Prisma.
function mapPlatforms(platforms?: ('instagram' | 'tiktok')[]): Platform[] {
  return (platforms ?? []).map((p) =>
    p === 'tiktok' ? Platform.TIKTOK : Platform.INSTAGRAM,
  );
}
