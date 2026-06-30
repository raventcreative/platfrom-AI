import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BrandCategory, Platform } from '@prisma/client';
import { AuthContext } from '../auth/auth.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';

const CATEGORY_MAP: Record<string, BrandCategory> = {
  skincare: BrandCategory.SKINCARE,
  fnb: BrandCategory.FNB,
  fashion: BrandCategory.FASHION,
  service: BrandCategory.SERVICE,
  other: BrandCategory.OTHER,
};

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
