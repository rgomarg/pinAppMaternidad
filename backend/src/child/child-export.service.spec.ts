import { Test, TestingModule } from '@nestjs/testing';
import { ChildExportService } from './child-export.service';

describe('ChildExportService', () => {
  let service: ChildExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChildExportService],
    }).compile();

    service = module.get<ChildExportService>(ChildExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
