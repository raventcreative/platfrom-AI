import { Controller, Get, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { OrgService } from './org.service';

@UseGuards(AuthGuard)
@Controller('me')
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get()
  me(@Auth() auth: AuthContext) {
    return this.org.me(auth);
  }
}
