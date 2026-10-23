import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma.service';
import { ThreadService } from './thread.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

describe('ThreadService', () => {
  let service: ThreadService;
  const prisma = {
    $transaction: jest.fn(),
    thread: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn() },
    tag: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreadService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ThreadService>(ThreadService);
  });

  describe('findAll', () => {
    it('pagina, filtra por tag y aplana el contador de mensajes', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 1, title: 'Hilo', _count: { messages: 3 } }], 21]);

      const result = await service.findAll({ tagId: 2, page: 2, limit: 10 });

      expect(prisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isHidden: false, tags: { some: { id: 2 } } },
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({ items: [{ id: 1, title: 'Hilo', messageCount: 3 }], page: 2, limit: 10, total: 21 });
    });
  });

  describe('findOne', () => {
    it('lanza NotFound si el hilo no existe o está oculto', async () => {
      prisma.thread.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('devuelve los mensajes en árbol con likedByMe', async () => {
      prisma.thread.findFirst.mockResolvedValue({
        id: 1,
        messages: [
          { id: 10, parentId: null, likes: [{ userId: 7 }] },
          { id: 11, parentId: 10, likes: [] },
        ],
      });

      const result = await service.findOne(1, 7);

      expect(result.messageCount).toBe(2);
      expect(result.messages).toEqual([
        { id: 10, parentId: null, likedByMe: true, replies: [{ id: 11, parentId: 10, likedByMe: false, replies: [] }] },
      ]);
    });
  });

  describe('create', () => {
    it('lanza NotFound si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.create({ title: 't', content: 'c', ownerId: 9 })).rejects.toThrow(NotFoundException);
      expect(prisma.thread.create).not.toHaveBeenCalled();
    });

    it('lanza BadRequest si algún tag no existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.tag.count.mockResolvedValue(1);
      await expect(service.create({ title: 't', content: 'c', ownerId: 1, tagIds: [1, 2] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('conecta los tags al crear el hilo', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.tag.count.mockResolvedValue(2);

      await service.create({ title: 't', content: 'c', ownerId: 1, tagIds: [1, 2] });

      expect(prisma.thread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { title: 't', content: 'c', ownerId: 1, tags: { connect: [{ id: 1 }, { id: 2 }] } },
        }),
      );
    });
  });

  describe('update y remove', () => {
    it('lanza Forbidden si quien edita no es el dueño', async () => {
      prisma.thread.findFirst.mockResolvedValue({ ownerId: 1 });
      await expect(service.update(5, { ownerId: 2, title: 'x' })).rejects.toThrow(ForbiddenException);
      expect(prisma.thread.update).not.toHaveBeenCalled();
    });

    it('reemplaza los tags al editar', async () => {
      prisma.thread.findFirst.mockResolvedValue({ ownerId: 1 });
      prisma.tag.count.mockResolvedValue(1);

      await service.update(5, { ownerId: 1, tagIds: [3] });

      expect(prisma.thread.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ tags: { set: [{ id: 3 }] } }) }),
      );
    });

    it('lanza Forbidden si quien borra no es el dueño', async () => {
      prisma.thread.findFirst.mockResolvedValue({ ownerId: 1 });
      await expect(service.remove(5, 2)).rejects.toThrow(ForbiddenException);
      expect(prisma.thread.delete).not.toHaveBeenCalled();
    });

    it('borra el hilo si es el dueño', async () => {
      prisma.thread.findFirst.mockResolvedValue({ ownerId: 1 });
      await service.remove(5, 1);
      expect(prisma.thread.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });
  });
});
