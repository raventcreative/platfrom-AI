import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobAgent, MessageRole } from '@prisma/client';
import { AuthContext } from '../auth/auth.decorator';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  private async assertBrand(auth: AuthContext, brandId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
    return brand;
  }

  private async loadConversation(auth: AuthContext, conversationId: string) {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { brand: true },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    if (convo.brand.orgId !== auth.orgId) throw new ForbiddenException();
    return convo;
  }

  async create(auth: AuthContext, brandId: string, title?: string) {
    await this.assertBrand(auth, brandId);
    return this.prisma.conversation.create({ data: { brandId, title } });
  }

  async listForBrand(auth: AuthContext, brandId: string) {
    await this.assertBrand(auth, brandId);
    return this.prisma.conversation.findMany({
      where: { brandId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(auth: AuthContext, conversationId: string) {
    await this.loadConversation(auth, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Chat shell. Sprint 1: orchestrator is a stub — every message is routed to a
   * placeholder STRATEGY job and acknowledged. Later sprints add intent routing
   * to the real agents and stream their output back as assistant messages.
   */
  async postMessage(auth: AuthContext, conversationId: string, content: string) {
    const convo = await this.loadConversation(auth, conversationId);

    const userMessage = await this.prisma.message.create({
      data: { conversationId, role: MessageRole.USER, content },
    });

    const job = await this.jobs.enqueue(convo.brandId, JobAgent.STRATEGY, {
      conversationId,
      content,
    });

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        content:
          'Diterima. Orchestrator/agent belum diimplementasi (Sprint 1) — pekerjaan diantrikan.',
        jobId: job.id,
      },
    });

    // Touch the conversation so it sorts to the top of the list.
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {},
    });

    return { userMessage, assistantMessage, jobId: job.id };
  }
}
