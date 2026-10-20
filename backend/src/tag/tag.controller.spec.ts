import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

describe('TagController', () => {
  let controller: TagController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [{ provide: TagService, useValue: {} }],
    }).compile();

    controller = module.get<TagController>(TagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
