import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MVP auth: Bearer token === User.apiToken.
 * Resolves the user + org and attaches an AuthContext to the request.
 * (Sprint 1 scaffold — replace with proper JWT/session before SaaS.)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const user = await this.prisma.user.findUnique({ where: { apiToken: token } });
    if (!user) throw new UnauthorizedException('Invalid token');

    req.auth = { userId: user.id, orgId: user.orgId, role: user.role };
    return true;
  }
}
