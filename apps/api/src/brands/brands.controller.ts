import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';

@UseGuards(AuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.brands.list(auth);
  }

  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateBrandDto) {
    return this.brands.create(auth, dto);
  }

  @Get(':id')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.brands.get(auth, id);
  }
}
