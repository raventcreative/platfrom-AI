import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CompareDto } from './dto/compare.dto';
import { ReviewDto } from './dto/review.dto';
import { InsightsService } from './insights.service';

/** Endpoint insight Instagram: review akun + perbandingan kompetitor. */
@UseGuards(AuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  // POST /insights/review — audit satu akun IG publik.
  @Post('review')
  review(@Auth() auth: AuthContext, @Body() dto: ReviewDto) {
    return this.insights.review(auth, dto);
  }

  // POST /insights/compare — brand vs 1-3 kompetitor.
  @Post('compare')
  compare(@Auth() auth: AuthContext, @Body() dto: CompareDto) {
    return this.insights.compare(auth, dto);
  }
}
