import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

/** Feature module untuk data org & profil user (endpoint /me). */
@Module({
  controllers: [OrgController],
  providers: [OrgService],
})
export class OrgModule {}
