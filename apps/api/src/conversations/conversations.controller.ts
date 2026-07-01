import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  PostMessageDto,
} from './dto/conversation.dto';

/** Controller percakapan (chat) per brand; semua route butuh AuthGuard. */
@UseGuards(AuthGuard)
@Controller()
export class ConversationsController {
  constructor(private readonly convos: ConversationsService) {}

  // POST /conversations — mulai percakapan baru untuk sebuah brand.
  @Post('conversations')
  create(@Auth() auth: AuthContext, @Body() dto: CreateConversationDto) {
    return this.convos.create(auth, dto.brandId, dto.title);
  }

  // GET /conversations?brandId= — daftar percakapan untuk brand tertentu.
  @Get('conversations')
  list(@Auth() auth: AuthContext, @Query('brandId') brandId: string) {
    return this.convos.listForBrand(auth, brandId);
  }

  // GET /conversations/:id/messages — riwayat pesan dalam satu percakapan.
  @Get('conversations/:id/messages')
  messages(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.convos.getMessages(auth, id);
  }

  // POST /conversations/:id/messages — kirim pesan baru & picu respons agent.
  @Post('conversations/:id/messages')
  post(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.convos.postMessage(auth, id, dto.content, dto.provider);
  }
}
