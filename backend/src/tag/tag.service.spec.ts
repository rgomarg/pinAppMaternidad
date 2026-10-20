import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'prisma/prisma.service';
import { TagService } from './tag.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

describe('TagService', () => {
  let service: TagService;
  const prisma = { tag: { findMany: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TagService>(TagService);
  });

  it('lista los tags ordenados por nombre', async () => {
    prisma.tag.findMany.mockResolvedValue([{ id: 1, name: 'Lactancia' }]);
    await expect(service.findAll()).resolves.toEqual([{ id: 1, name: 'Lactancia' }]);
    expect(prisma.tag.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { name: 'asc' } }));
  });
});
