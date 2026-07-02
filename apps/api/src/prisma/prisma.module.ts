import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Module Prisma global: PrismaService dapat di-inject di seluruh aplikasi. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
