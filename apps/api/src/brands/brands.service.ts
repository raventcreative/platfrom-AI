import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BrandCategory, Platform, Prisma } from '@prisma/client';
import { BrandCategory, JobAgent, Platform } from '@prisma/client';
import { AuthContext } from '../auth/auth.decorator';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { TrainVoiceDto } from './dto/train-voice.dto';

// Peta string kategori dari DTO ke enum BrandCategory Prisma.
const CATEGORY_MAP: Record<string, BrandCategory> = {
  skincare: BrandCategory.SKINCARE,
  fnb: BrandCategory.FNB,
  fashion: BrandCategory.FASHION,
  service: BrandCategory.SERVICE,
  other: BrandCategory.OTHER,
};

/** Logika bisnis brand: query & mutasi selalu dibatasi pada org milik pemanggil. */
@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  /** Ambil daftar brand aktif milik org, terbaru dulu. */
  list(auth: AuthContext) {
    return this.prisma.brand.findMany({
      where: { orgId: auth.orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Buat brand baru untuk org pemanggil. */
  create(auth: AuthContext, dto: CreateBrandDto) {
    return this.prisma.brand.create({
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
  }

  /** Update parsial: pastikan brand milik org, lalu ubah hanya field yang dikirim. */
  async update(auth: AuthContext, id: string, dto: UpdateBrandDto) {
    await this.assertOwned(auth, id);

    return this.prisma.brand.update({
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
  }

  /** Ambil detail brand beserta relasinya; tolak jika bukan milik org pemanggil. */
  async get(auth: AuthContext, id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { voiceProfile: true, kit: true, competitors: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
    return brand;
  }

  /** Helper guard: verifikasi brand ada & dimiliki org, atau lempar 404/403. */
  private async assertOwned(auth: AuthContext, id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
    return brand;
  }
}

// Konversi daftar platform bergaya string DTO ke enum Platform Prisma.
function mapPlatforms(platforms?: ('instagram' | 'tiktok')[]): Platform[] {
  return (platforms ?? []).map((p) =>
    p === 'tiktok' ? Platform.TIKTOK : Platform.INSTAGRAM,
  );
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
}
