import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { JobsService } from './jobs.service';

@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':id')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.jobs.get(auth, id);
  }
}
