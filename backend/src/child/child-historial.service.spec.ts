import { Test, TestingModule } from '@nestjs/testing';
import { ChildHistorialService } from './child-historial.service';

describe('ChildHistorialService', () => {
  let service: ChildHistorialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChildHistorialService],
    }).compile();

    service = module.get<ChildHistorialService>(ChildHistorialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
