import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { AutomationService } from './automation.service';
import { AutomateDto } from './dto/automate.dto';
import { GenerateImageDto } from './dto/generate-image.dto';

/** Endpoint otomasi konten (brief → JSON spec → reel/post, atau → gambar). */
@UseGuards(AuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  // POST /automation/run — pipeline teks (brief → spec → reel/post).
  @Post('run')
  run(@Auth() auth: AuthContext, @Body() dto: AutomateDto) {
    return this.automation.run(auth, dto);
  }

  // POST /automation/image — brief → prompt gambar → OpenAI Images → gambar.
  @Post('image')
  image(@Auth() auth: AuthContext, @Body() dto: GenerateImageDto) {
    return this.automation.runImage(auth, dto);
  }

  // GET /automation/images?brandId= — riwayat generasi gambar.
  @Get('images')
  listImages(@Auth() auth: AuthContext, @Query('brandId') brandId?: string) {
    return this.automation.listImages(auth, brandId);
  }

  // DELETE /automation/images/:id — hapus satu entri riwayat.
  @Delete('images/:id')
  deleteImage(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.automation.deleteImage(auth, id);
  }
}
