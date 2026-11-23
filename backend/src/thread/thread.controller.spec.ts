import { Test, TestingModule } from '@nestjs/testing';
import { ThreadController } from './thread.controller';
import { ThreadService } from './thread.service';
import { ThreadSummaryService } from './thread-summary.service';
import { PrismaService } from 'prisma/prisma.service';

// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });
// @nestjs/mapped-types v12 es solo ESM y jest no puede cargarlo; este test no usa los DTOs
jest.mock('@nestjs/mapped-types', () => ({ PartialType: (c: unknown) => c, OmitType: (c: unknown) => c }));
// El SDK de Gemini no se necesita en este test: el servicio de resumen se sustituye por un mock
jest.mock('@google/genai', () => ({ GoogleGenAI: class GoogleGenAI {} }));

describe('ThreadController', () => {
  let controller: ThreadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThreadController],
      providers: [
        { provide: ThreadService, useValue: {} },
        { provide: ThreadSummaryService, useValue: {} },
        // ProGuard (endpoint de resumen) depende de PrismaService
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ThreadController>(ThreadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
