import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import {PrismaService} from "prisma/prisma.service";
@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ targetType, targetId, reporterId, comment }: CreateReportDto) {
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { id: true, name: true },
    });
    if (!reporter) throw new NotFoundException(`No user with id ${reporterId} found`);

    if (targetType === 'THREAD') {
      const thread = await this.prisma.thread.findUnique({
        where: { id: targetId },
        select: { id: true, title: true },
      });
      if (!thread) throw new NotFoundException(`No thread with id ${targetId} found`);

    } else if (targetType === 'MESSAGE') {
      const message = await this.prisma.message.findUnique({
        where: { id: targetId },
        select: { id: true, content: true },
      });
      if (!message) throw new NotFoundException(`No message with id ${targetId} found`);
      
    }
    const existing = await this.prisma.report.findFirst({
      where: { reporterId, targetType, targetId },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Ya has reportado este contenido.');

    let reason : string;
    reason =comment.trim();

    return this.prisma.report.create({
      data: { reason, targetType, targetId, reporterId },
      select: { id: true, status: true, createdAt: true },
    });
  }

  findAll() {
    return `This action returns all report`;
  }

  findOne(id: number) {
    return `This action returns a #${id} report`;
  }

  update(id: number, updateReportDto: UpdateReportDto) {
    return `This action updates a #${id} report`;
  }

  remove(id: number) {
    return `This action removes a #${id} report`;
  }
}
