import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

/** Controller CRUD brand; seluruh route dilindungi AuthGuard (butuh token valid). */
@UseGuards(AuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  // GET /brands — daftar brand milik org pemanggil.
  @Get()
  list(@Auth() auth: AuthContext) {
    return this.brands.list(auth);
  }

  // POST /brands — buat brand baru.
  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateBrandDto) {
    return this.brands.create(auth, dto);
  }

  // GET /brands/:id — detail satu brand (termasuk voice profile, kit, competitors).
  @Get(':id')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.brands.get(auth, id);
  }

  // PATCH /brands/:id — perbarui sebagian field brand.
  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brands.update(auth, id, dto);
  }
}
