import { Controller, Get, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { OrgService } from './org.service';

/** Controller identitas: mengembalikan profil user & org yang sedang login. */
@UseGuards(AuthGuard)
@Controller('me')
export class OrgController {
  constructor(private readonly org: OrgService) {}

  // GET /me — data user pemanggil beserta org-nya.
  @Get()
  me(@Auth() auth: AuthContext) {
    return this.org.me(auth);
  }
}
