import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityType, Prisma, ReportStatus, Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  ListAdminReportsQueryDto,
  ListAdminThreadsQueryDto,
  ListAdminUsersQueryDto,
  MessageStatus,
  ThreadStatus,
  UserStatus,
} from './dto/admin-query.dto';

// El panel ve los registros originales intactos (también los ocultos), nunca la contraseña
const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  blockedAt: true,
  _count: { select: { threads: true, messages: true } },
} satisfies Prisma.UserSelect;

const adminThreadSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  isHidden: true,
  deletedAt: true,
  owner: { select: { id: true, name: true, email: true, role: true, blockedAt: true } },
  tags: { select: { id: true, name: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.ThreadSelect;

const adminMessageSelect = {
  id: true,
  content: true,
  createdAt: true,
  isHidden: true,
  deletedAt: true,
  threadId: true,
  parentId: true,
  author: { select: { id: true, name: true, email: true, role: true, blockedAt: true } },
} satisfies Prisma.MessageSelect;

const adminReportSelect = {
  id: true,
  reason: true,
  status: true,
  createdAt: true,
  targetType: true,
  targetId: true,
  reporter: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ReportSelect;

type AdminReportRow = Prisma.ReportGetPayload<{ select: typeof adminReportSelect }>;
type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;
type AdminThreadRow = Prisma.ThreadGetPayload<{ select: typeof adminThreadSelect }>;
type AdminMessageRow = Prisma.MessageGetPayload<{ select: typeof adminMessageSelect }>;

const userStatusWhere: Record<UserStatus, Prisma.UserWhereInput> = {
  ACTIVE: { blockedAt: null },
  BLOCKED: { blockedAt: { not: null } },
};

// Mismo orden de prioridad que threadStatus()
const threadStatusWhere: Record<ThreadStatus, Prisma.ThreadWhereInput> = {
  VISIBLE: { deletedAt: null, isHidden: false, owner: { blockedAt: null } },
  DELETED: { deletedAt: { not: null } },
  AUTHOR_BLOCKED: { deletedAt: null, owner: { blockedAt: { not: null } } },
  HIDDEN: { deletedAt: null, owner: { blockedAt: null }, isHidden: true },
};

function threadStatus(thread: Pick<AdminThreadRow, 'deletedAt' | 'isHidden' | 'owner'>): ThreadStatus {
  if (thread.deletedAt) return 'DELETED';
  if (thread.owner.blockedAt) return 'AUTHOR_BLOCKED';
  if (thread.isHidden) return 'HIDDEN';
  return 'VISIBLE';
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findUsers({ search, status }: ListAdminUsersQueryDto) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(status && userStatusWhere[status]),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
      select: adminUserSelect,
    });
    return users.map(toAdminUser);
  }

  // Bloquear oculta en cascada el perfil y todo el contenido del usuario (ver thread/visibility.ts)
  async blockUser(id: number, adminId: number) {
    if (id === adminId) {
      throw new BadRequestException('An administrator cannot block themselves');
    }
    const user = await this.findUserOrFail(id);
    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Administrators cannot be blocked');
    }
    // Si ya estaba bloqueado se conserva la fecha original (auditoría)
    if (user.blockedAt) return toAdminUser(user);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { blockedAt: new Date() },
      select: adminUserSelect,
    });
    return toAdminUser(updated);
  }

  async unblockUser(id: number) {
    await this.findUserOrFail(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { blockedAt: null },
      select: adminUserSelect,
    });
    return toAdminUser(updated);
  }

  async findThreads({ search, status }: ListAdminThreadsQueryDto) {
    const threads = await this.prisma.thread.findMany({
      where: {
        ...(status && threadStatusWhere[status]),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { owner: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      select: adminThreadSelect,
    });
    return threads.map(toAdminThread);
  }

  // Borrado lógico: el hilo desaparece del foro público pero se conserva en la BD
  async deleteThread(id: number) {
    const thread = await this.findThreadOrFail(id);
    if (thread.deletedAt) return toAdminThread(thread);

    const updated = await this.prisma.thread.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: adminThreadSelect,
    });
    return toAdminThread(updated);
  }

  async restoreThread(id: number) {
    await this.findThreadOrFail(id);
    const updated = await this.prisma.thread.update({
      where: { id },
      data: { deletedAt: null },
      select: adminThreadSelect,
    });
    return toAdminThread(updated);
  }

  async findThreadMessages(threadId: number) {
    await this.findThreadOrFail(threadId);
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: adminMessageSelect,
    });
    return messages.map(toAdminMessage);
  }

  // Borrado lógico: el comentario desaparece al instante de todas las vistas públicas
  // (visibleMessageWhere se aplica en cada consulta) pero se conserva en la BD
  async deleteMessage(id: number) {
    const message = await this.findMessageOrFail(id);
    if (message.deletedAt) return toAdminMessage(message);

    const updated = await this.prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: adminMessageSelect,
    });
    return toAdminMessage(updated);
  }

  async restoreMessage(id: number) {
    await this.findMessageOrFail(id);
    const updated = await this.prisma.message.update({
      where: { id },
      data: { deletedAt: null },
      select: adminMessageSelect,
    });
    return toAdminMessage(updated);
  }

  async findReports({ search, status }: ListAdminReportsQueryDto) {
    const reports = await this.prisma.report.findMany({
      where: {
        targetType: { in: [EntityType.THREAD, EntityType.MESSAGE] },
        ...(status && { status }),
        ...(search && { reason: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
      select: adminReportSelect,
    });
    return this.withTargets(reports);
  }

  async resolveReport(id: number) {
    return this.reviewReport(id, ReportStatus.RESOLVED);
  }

  async dismissReport(id: number) {
    return this.reviewReport(id, ReportStatus.DISMISSED);
  }

  // El contenido queda oculto mientras tenga al menos un reporte aceptado
  private async reviewReport(id: number, status: ReportStatus) {
    const report = await this.prisma.report.findUnique({ where: { id }, select: adminReportSelect });
    if (!report) {
      throw new NotFoundException(`No report with id ${id} found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.report.update({ where: { id }, data: { status }, select: adminReportSelect });
      const accepted = await tx.report.count({
        where: { targetType: report.targetType, targetId: report.targetId, status: ReportStatus.RESOLVED },
      });
      const isHidden = accepted > 0;
      if (report.targetType === EntityType.THREAD) {
        await tx.thread.updateMany({ where: { id: report.targetId }, data: { isHidden } });
      } else if (report.targetType === EntityType.MESSAGE) {
        await tx.message.updateMany({ where: { id: report.targetId }, data: { isHidden } });
      }
      return saved;
    });
    const [row] = await this.withTargets([updated]);
    return row;
  }

  // Adjunta a cada reporte un resumen del hilo o mensaje reportado (el reporte es polimórfico)
  private async withTargets(reports: AdminReportRow[]) {
    const threadIds = reports.filter((r) => r.targetType === EntityType.THREAD).map((r) => r.targetId);
    const messageIds = reports.filter((r) => r.targetType === EntityType.MESSAGE).map((r) => r.targetId);
    const [threads, messages] = await Promise.all([
      this.prisma.thread.findMany({
        where: { id: { in: threadIds } },
        select: { id: true, title: true, content: true, isHidden: true, deletedAt: true, owner: { select: { id: true, name: true } } },
      }),
      this.prisma.message.findMany({
        where: { id: { in: messageIds } },
        select: {
          id: true,
          content: true,
          isHidden: true,
          deletedAt: true,
          threadId: true,
          author: { select: { id: true, name: true } },
        },
      }),
    ]);
    const threadById = new Map(threads.map((t) => [t.id, t]));
    const messageById = new Map(messages.map((m) => [m.id, m]));

    return reports.map((report) => {
      let target: { title: string | null; content: string; isHidden: boolean; author: { id: number; name: string } } | null = null;
      if (report.targetType === EntityType.THREAD) {
        const t = threadById.get(report.targetId);
        if (t) target = { title: t.title, content: t.content, isHidden: t.isHidden, author: t.owner };
      } else {
        const m = messageById.get(report.targetId);
        // Un comentario eliminado por un admin tampoco se ve en el foro
        if (m) target = { title: null, content: m.content, isHidden: m.isHidden || m.deletedAt !== null, author: m.author };
      }
      return { ...report, target };
    });
  }

  private async findUserOrFail(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: adminUserSelect });
    if (!user) {
      throw new NotFoundException(`No user with id ${id} found`);
    }
    return user;
  }

  private async findMessageOrFail(id: number) {
    const message = await this.prisma.message.findUnique({ where: { id }, select: adminMessageSelect });
    if (!message) {
      throw new NotFoundException(`No message with id ${id} found`);
    }
    return message;
  }

  private async findThreadOrFail(id: number) {
    const thread = await this.prisma.thread.findUnique({ where: { id }, select: adminThreadSelect });
    if (!thread) {
      throw new NotFoundException(`No thread with id ${id} found`);
    }
    return thread;
  }
}

function toAdminUser({ _count, ...user }: AdminUserRow) {
  return {
    ...user,
    status: (user.blockedAt ? 'BLOCKED' : 'ACTIVE') as UserStatus,
    threadCount: _count.threads,
    messageCount: _count.messages,
  };
}

function toAdminThread({ _count, ...thread }: AdminThreadRow) {
  return { ...thread, status: threadStatus(thread), messageCount: _count.messages };
}

// Mismo orden de prioridad que threadStatus()
function toAdminMessage(message: AdminMessageRow) {
  let status: MessageStatus = 'VISIBLE';
  if (message.deletedAt) status = 'DELETED';
  else if (message.author.blockedAt) status = 'AUTHOR_BLOCKED';
  else if (message.isHidden) status = 'HIDDEN';
  return { ...message, status };
}
