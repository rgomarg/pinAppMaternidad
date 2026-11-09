import { Test, TestingModule } from '@nestjs/testing';
import { CheckListItemService } from './check-list-item.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CheckListItemService', () => {
  let service: CheckListItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckListItemService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<CheckListItemService>(CheckListItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
