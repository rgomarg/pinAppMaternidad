import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { ListAdminThreadsQueryDto, ListAdminUsersQueryDto, ThreadStatus, UserStatus } from './dto/admin-query.dto';

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

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;
type AdminThreadRow = Prisma.ThreadGetPayload<{ select: typeof adminThreadSelect }>;

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

  private async findUserOrFail(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: adminUserSelect });
    if (!user) {
      throw new NotFoundException(`No user with id ${id} found`);
    }
    return user;
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
