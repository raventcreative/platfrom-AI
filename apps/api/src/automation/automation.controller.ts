import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { AutomationService } from './automation.service';
import { AutomateDto } from './dto/automate.dto';

/** Endpoint otomasi konten (brief → JSON spec → reel/post). */
@UseGuards(AuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  // POST /automation/run — jalankan pipeline, hasil dikembalikan sinkron.
  @Post('run')
  run(@Auth() auth: AuthContext, @Body() dto: AutomateDto) {
    return this.automation.run(auth, dto);
  }
}
