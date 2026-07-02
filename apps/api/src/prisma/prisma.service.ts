import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Wrapper PrismaClient sebagai provider Nest; membuka koneksi DB saat modul init. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Lifecycle hook Nest: buka koneksi ke database saat aplikasi start.
  async onModuleInit() {
    await this.$connect();
  }
}
