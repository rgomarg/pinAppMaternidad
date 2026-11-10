import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

const user = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  name: 'Carlos',
  role: 'USER',
  blockedAt: null,
  _count: { threads: 2, messages: 3 },
  ...overrides,
});

const thread = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  title: 'Hilo',
  isHidden: false,
  deletedAt: null,
  owner: { id: 5, blockedAt: null },
  _count: { messages: 4 },
  ...overrides,
});

describe('AdminService', () => {
  let service: AdminService;
  const prisma = {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    thread: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('usuarios', () => {
    it('filtra por estado y búsqueda y devuelve el estado de cada usuario', async () => {
      prisma.user.findMany.mockResolvedValue([user({ blockedAt: new Date() })]);

      const result = await service.findUsers({ adminId: 1, search: 'car', status: 'BLOCKED' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            blockedAt: { not: null },
            OR: [
              { name: { contains: 'car', mode: 'insensitive' } },
              { email: { contains: 'car', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(result[0]).toEqual(expect.objectContaining({ status: 'BLOCKED', threadCount: 2, messageCount: 3 }));
    });

    it('bloquear marca blockedAt y deja el perfil como Bloqueado', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      prisma.user.update.mockResolvedValue(user({ blockedAt: new Date() }));

      const result = await service.blockUser(5, 1);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: { blockedAt: expect.any(Date) } }),
      );
      expect(result.status).toBe('BLOCKED');
    });

    it('bloquear a alguien ya bloqueado conserva la fecha original', async () => {
      const blockedAt = new Date('2026-01-01');
      prisma.user.findUnique.mockResolvedValue(user({ blockedAt }));

      const result = await service.blockUser(5, 1);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result.blockedAt).toBe(blockedAt);
    });

    it('no permite bloquearse a sí mismo ni a otro admin', async () => {
      await expect(service.blockUser(1, 1)).rejects.toThrow(BadRequestException);
      prisma.user.findUnique.mockResolvedValue(user({ role: 'ADMIN' }));
      await expect(service.blockUser(5, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lanza NotFound si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.unblockUser(99)).rejects.toThrow(NotFoundException);
    });

    it('desbloquear limpia blockedAt', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ blockedAt: new Date() }));
      prisma.user.update.mockResolvedValue(user());

      const result = await service.unblockUser(5);

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { blockedAt: null } }));
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('hilos', () => {
    it('incluye los hilos ocultos con su estado (registro original intacto)', async () => {
      prisma.thread.findMany.mockResolvedValue([
        thread({ id: 1, deletedAt: new Date() }),
        thread({ id: 2, owner: { id: 5, blockedAt: new Date() } }),
        thread({ id: 3, isHidden: true }),
        thread({ id: 4 }),
      ]);

      const result = await service.findThreads({ adminId: 1 });

      expect(prisma.thread.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result.map((t) => t.status)).toEqual(['DELETED', 'AUTHOR_BLOCKED', 'HIDDEN', 'VISIBLE']);
      expect(result[0]).toEqual(expect.objectContaining({ title: 'Hilo', messageCount: 4 }));
    });

    it('filtra por estado Eliminado', async () => {
      prisma.thread.findMany.mockResolvedValue([]);
      await service.findThreads({ adminId: 1, status: 'DELETED' });
      expect(prisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: { not: null } } }),
      );
    });

    it('eliminar hace borrado lógico, nunca físico', async () => {
      prisma.thread.findUnique.mockResolvedValue(thread());
      prisma.thread.update.mockResolvedValue(thread({ deletedAt: new Date() }));

      const result = await service.deleteThread(7);

      expect(prisma.thread.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 }, data: { deletedAt: expect.any(Date) } }),
      );
      expect(prisma.thread.delete).not.toHaveBeenCalled();
      expect(result.status).toBe('DELETED');
    });

    it('restaurar vuelve a hacer visible el hilo', async () => {
      prisma.thread.findUnique.mockResolvedValue(thread({ deletedAt: new Date() }));
      prisma.thread.update.mockResolvedValue(thread());

      const result = await service.restoreThread(7);

      expect(prisma.thread.update).toHaveBeenCalledWith(expect.objectContaining({ data: { deletedAt: null } }));
      expect(result.status).toBe('VISIBLE');
    });

    it('lanza NotFound si el hilo no existe', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);
      await expect(service.deleteThread(99)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('AdminGuard', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new AdminGuard(prisma as unknown as PrismaService);
  const context = (query: Record<string, unknown>) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ query }) }) }) as never;

  beforeEach(() => jest.resetAllMocks());

  it('deja pasar a un ADMIN activo', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', blockedAt: null });
    await expect(guard.canActivate(context({ adminId: '1' }))).resolves.toBe(true);
  });

  it('rechaza si falta adminId', async () => {
    await expect(guard.canActivate(context({}))).rejects.toThrow(ForbiddenException);
  });

  it('rechaza a usuarios que no son ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'USER', blockedAt: null });
    await expect(guard.canActivate(context({ adminId: '2' }))).rejects.toThrow(ForbiddenException);
  });
});
