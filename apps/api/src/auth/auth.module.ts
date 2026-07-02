import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

/**
 * Auth module (global): menyediakan AuthGuard agar bisa dipakai lewat @UseGuards
 * di controller mana pun tanpa perlu di-import ulang.
 */
@Global()
@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
