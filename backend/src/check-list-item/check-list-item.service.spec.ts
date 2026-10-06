import { Test, TestingModule } from '@nestjs/testing';
import { CheckListItemService } from './check-list-item.service';

describe('CheckListItemService', () => {
  let service: CheckListItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckListItemService],
    }).compile();

    service = module.get<CheckListItemService>(CheckListItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
