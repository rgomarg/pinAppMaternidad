import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'prisma/prisma.service';
import { ChildService } from './child.service';

// El paquete es ESM y Jest no lo transforma: se sustituye por una clase vacía.
// La config de jest no resuelve el alias 'prisma/...' (baseUrl).
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });
jest.mock('@nestjs/event-emitter', () => ({ EventEmitter2: class EventEmitter2 {} }));

describe('ChildService', () => {
  let service: ChildService;
  const prisma = {
    child: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ChildService>(ChildService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea el hijo con sus vacunas y medicamentos iniciales', async () => {
      prisma.child.create.mockResolvedValue({ id: 1, birthDate: new Date() });

      await service.create({
        name: 'Leo',
        birthDate: new Date('2025-01-01'),
        parentId: 1,
        sex: 'MALE',
        vaccines: [{ name: ' Triple vírica ' }],
        medicines: [{ name: 'Apiretal', dosage: '2.5 ml', intervalHours: 8 }],
      });

      const data = prisma.child.create.mock.calls[0][0].data;
      expect(data.vaccines.create).toEqual([expect.objectContaining({ name: 'Triple vírica' })]);
      expect(data.medicine.create).toEqual([
        expect.objectContaining({ name: 'Apiretal', dosage: '2.5 ml', intervalHours: 8 }),
      ]);
    });
  });

  describe('update', () => {
    it('actualiza los datos básicos del hijo', async () => {
      prisma.child.findUnique.mockResolvedValue({ id: 1 });
      prisma.child.update.mockResolvedValue({ id: 1, name: 'Leo' });

      await service.update(1, { name: '  Leo ', bloodGroup: 'A+', sex: 'MALE' });

      expect(prisma.child.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ name: 'Leo', bloodGroup: 'A+', sex: 'MALE' }),
      });
    });

    it('lanza NotFoundException si el hijo no existe', async () => {
      prisma.child.findUnique.mockResolvedValue(null);
      await expect(service.update(99, { name: 'X' })).rejects.toThrow(NotFoundException);
      expect(prisma.child.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina el hijo existente', async () => {
      prisma.child.findUnique.mockResolvedValue({ id: 1 });
      prisma.child.delete.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(prisma.child.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('lanza NotFoundException si el hijo no existe', async () => {
      prisma.child.findUnique.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(prisma.child.delete).not.toHaveBeenCalled();
    });
  });
});
