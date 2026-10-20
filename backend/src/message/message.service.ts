import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { authorSelect } from '../thread/thread.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ content, authorId, threadId, parentId }: CreateMessageDto) {
    const [thread, author] = await Promise.all([
      this.prisma.thread.findFirst({ where: { id: threadId, isHidden: false }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: authorId }, select: { id: true } }),
    ]);
    if (!thread) {
      throw new NotFoundException(`No thread with id ${threadId} found`);
    }
    if (!author) {
      throw new NotFoundException(`No user with id ${authorId} found`);
    }

    if (parentId !== undefined) {
      const parent = await this.prisma.message.findFirst({
        where: { id: parentId, isHidden: false },
        select: { threadId: true },
      });
      if (!parent || parent.threadId !== threadId) {
        throw new BadRequestException('The parent message does not belong to this thread');
      }
    }

    const message = await this.prisma.message.create({
      data: { content, authorId, threadId, parentId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        likesCount: true,
        parentId: true,
        author: { select: authorSelect },
      },
    });
    // Mismo formato que los nodos de GET /thread/:id
    return { ...message, likedByMe: false, replies: [] };
  }

  // Las respuestas al mensaje no se borran: su parentId pasa a null (onDelete: SetNull)
  async remove(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id }, select: { authorId: true } });
    if (!message) {
      throw new NotFoundException(`No message with id ${id} found`);
    }
    if (message.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this message');
    }
    await this.prisma.message.delete({ where: { id } });
  }
}
