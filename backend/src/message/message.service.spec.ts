import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma.service';
import { MessageService } from './message.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

describe('MessageService', () => {
  let service: MessageService;
  const tx = {
    messageLike: { createMany: jest.fn(), deleteMany: jest.fn() },
    message: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    thread: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    message: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.thread.findFirst.mockResolvedValue({ id: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 2 });
    });

    it('lanza NotFound si el hilo no existe o está oculto', async () => {
      prisma.thread.findFirst.mockResolvedValue(null);
      await expect(service.create({ content: 'hola', authorId: 2, threadId: 1 })).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequest si el mensaje padre es de otro hilo', async () => {
      prisma.message.findFirst.mockResolvedValue({ threadId: 99 });
      await expect(service.create({ content: 'hola', authorId: 2, threadId: 1, parentId: 5 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('devuelve el mensaje con el formato de nodo del árbol', async () => {
      prisma.message.findFirst.mockResolvedValue({ threadId: 1 });
      prisma.message.create.mockResolvedValue({ id: 8, parentId: 5 });

      const result = await service.create({ content: 'hola', authorId: 2, threadId: 1, parentId: 5 });

      expect(result).toEqual({ id: 8, parentId: 5, likedByMe: false, replies: [] });
    });
  });

  describe('likes', () => {
    beforeEach(() => {
      prisma.message.findFirst.mockResolvedValue({ id: 3 });
      prisma.user.findUnique.mockResolvedValue({ id: 2 });
    });

    it('suma al contador solo las filas insertadas', async () => {
      tx.messageLike.createMany.mockResolvedValue({ count: 0 });
      tx.message.update.mockResolvedValue({ likesCount: 4 });

      const result = await service.like(3, 2);

      expect(tx.messageLike.createMany).toHaveBeenCalledWith({ data: { userId: 2, messageId: 3 }, skipDuplicates: true });
      expect(tx.message.update).toHaveBeenCalledWith(expect.objectContaining({ data: { likesCount: { increment: 0 } } }));
      expect(result).toEqual({ likesCount: 4, likedByMe: true });
    });

    it('resta al contador solo las filas borradas', async () => {
      tx.messageLike.deleteMany.mockResolvedValue({ count: 1 });
      tx.message.update.mockResolvedValue({ likesCount: 3 });

      const result = await service.unlike(3, 2);

      expect(tx.message.update).toHaveBeenCalledWith(expect.objectContaining({ data: { likesCount: { decrement: 1 } } }));
      expect(result).toEqual({ likesCount: 3, likedByMe: false });
    });

    it('lanza NotFound si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.like(3, 999)).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lanza Forbidden si quien borra no es el autor', async () => {
      prisma.message.findUnique.mockResolvedValue({ authorId: 1 });
      await expect(service.remove(3, 2)).rejects.toThrow(ForbiddenException);
      expect(prisma.message.delete).not.toHaveBeenCalled();
    });
  });
});
