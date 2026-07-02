import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BrandCategory, JobAgent, Platform } from '@prisma/client';
import { AuthContext } from '../auth/auth.decorator';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { TrainVoiceDto } from './dto/train-voice.dto';

const CATEGORY_MAP: Record<string, BrandCategory> = {
  skincare: BrandCategory.SKINCARE,
  fnb: BrandCategory.FNB,
  fashion: BrandCategory.FASHION,
  service: BrandCategory.SERVICE,
  other: BrandCategory.OTHER,
};

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  list(auth: AuthContext) {
    return this.prisma.brand.findMany({
      where: { orgId: auth.orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(auth: AuthContext, dto: CreateBrandDto) {
    const platforms = (dto.platforms ?? []).map((p) =>
      p === 'tiktok' ? Platform.TIKTOK : Platform.INSTAGRAM,
    );

    return this.prisma.brand.create({
      data: {
        orgId: auth.orgId,
        name: dto.name,
        niche: dto.niche,
        description: dto.description,
        category: dto.category ? CATEGORY_MAP[dto.category] : BrandCategory.OTHER,
        platforms,
      },
    });
  }

  async get(auth: AuthContext, id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { voiceProfile: true, kit: true, competitors: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
    return brand;
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
}
