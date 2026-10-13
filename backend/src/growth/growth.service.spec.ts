import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma.service';
import { GrowthService } from './growth.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

const MONTH_MS = 30.4375 * 24 * 60 * 60 * 1000;

describe('GrowthService', () => {
  let service: GrowthService;
  const prisma = { child: { findUnique: jest.fn(), update: jest.fn() } };

  // Niño nacido hace 24 meses con mediciones sobre la mediana de la OMS
  const birthDate = new Date(Date.now() - 24 * MONTH_MS);
  const at = (months: number) => new Date(birthDate.getTime() + months * MONTH_MS);
  const child = {
    id: 1,
    name: 'Leo',
    sex: 'MALE',
    birthDate,
    measurements: [
      { id: 1, date: at(12), weight: 9.6, height: 75.7, childId: 1 },
      { id: 2, date: at(18), weight: 10.9, height: null, childId: 1 },
      { id: 3, date: at(23), weight: 12.0, height: 87.1, childId: 1 },
    ],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrowthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<GrowthService>(GrowthService);
  });

  it('lanza NotFound si el menor no existe', async () => {
    prisma.child.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('no devuelve series si el menor no tiene sexo', async () => {
    prisma.child.findUnique.mockResolvedValue({ ...child, sex: null });
    const result = await service.findOne(1);
    expect(result.weight).toBeNull();
    expect(result.height).toBeNull();
  });

  it('calcula percentiles, curvas, proyección y valoración', async () => {
    prisma.child.findUnique.mockResolvedValue(child);
    const { weight, height } = await service.findOne(1);

    expect(weight!.unit).toBe('kg');
    expect(weight!.points).toHaveLength(3);
    expect(weight!.points[0].percentile).toBeGreaterThan(40);
    expect(weight!.points[0].percentile).toBeLessThan(60);
    expect(height!.points).toHaveLength(2); // la medición sin altura se ignora

    // Curvas desde 2 meses antes de la primera medición hasta el final de la proyección
    expect(weight!.curves[0].month).toBe(10);
    expect(weight!.curves[0].p3).toBeLessThan(weight!.curves[0].p50);
    expect(weight!.projection).toHaveLength(6);
    expect(weight!.projection[5].value).toBeGreaterThan(12);

    expect(weight!.insight!.level).toBe('ok');
  });

  it('avisa cuando el peso cruza percentiles hacia abajo', async () => {
    prisma.child.findUnique.mockResolvedValue({
      ...child,
      measurements: [
        { id: 1, date: at(12), weight: 10.8, height: null, childId: 1 },
        { id: 2, date: at(23), weight: 10.9, height: null, childId: 1 },
      ],
    });
    const { weight } = await service.findOne(1);
    expect(weight!.insight!.level).toBe('warning');
    expect(weight!.insight!.title).toContain('bajado');
  });

  it('marca alerta por debajo del percentil 3', async () => {
    prisma.child.findUnique.mockResolvedValue({
      ...child,
      measurements: [{ id: 1, date: at(23), weight: 9.0, height: null, childId: 1 }],
    });
    const { weight } = await service.findOne(1);
    expect(weight!.insight!.level).toBe('alert');
  });
});
