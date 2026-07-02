import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

/** Feature module untuk pengelolaan brand (controller + service). */
@Module({
  imports: [JobsModule],
  controllers: [BrandsController],
  providers: [BrandsService],
})
export class BrandsModule {}
