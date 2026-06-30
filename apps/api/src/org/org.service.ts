import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthContext } from '../auth/auth.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  async me(auth: AuthContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      include: { org: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      org: { id: user.org.id, name: user.org.name, plan: user.org.plan },
    };
  }
}
