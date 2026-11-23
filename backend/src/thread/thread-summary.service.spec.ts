// La config de jest no resuelve el alias 'prisma/...' (baseUrl); se sustituye por un mock
jest.mock('prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

// Cliente de Gemini simulado: cuenta las llamadas y responde tras un pequeño retraso
const create = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: class GoogleGenAI {
    interactions = { create };
  },
}));

import { ThreadSummaryService } from './thread-summary.service';

describe('ThreadSummaryService', () => {
  let thread: { title: string; content: string; messages: unknown[] };
  let service: ThreadSummaryService;

  beforeEach(() => {
    create.mockReset();
    create.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ output_text: '• resumen' }), 10)),
    );
    thread = {
      title: 'Tos nocturna',
      content: 'Mi hija tiene tos',
      messages: [{ id: 1, parentId: null, content: 'Miel de tomillo', likesCount: 2 }],
    };
    const prisma = { thread: { findFirst: jest.fn(async () => thread) } };
    service = new ThreadSummaryService(prisma as never);
  });

  it('10 usuarios a la vez en el mismo hilo hacen una sola llamada a Gemini', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => service.summarize(1)));
    expect(create).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.summary === '• resumen')).toBe(true);
  });

  it('si el hilo no cambia, las siguientes peticiones usan el resumen guardado', async () => {
    await service.summarize(1);
    await service.summarize(1);
    await service.summarize(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('si el hilo cambia (respuesta nueva), se vuelve a generar', async () => {
    await service.summarize(1);
    thread.messages = [...thread.messages, { id: 2, parentId: null, content: 'Humidificador', likesCount: 0 }];
    await service.summarize(1);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('si Gemini falla, no se guarda nada y se puede reintentar', async () => {
    create.mockRejectedValueOnce(new Error('503'));
    await expect(service.summarize(1)).rejects.toThrow('no está disponible');
    await expect(service.summarize(1)).resolves.toEqual({ summary: '• resumen' });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
