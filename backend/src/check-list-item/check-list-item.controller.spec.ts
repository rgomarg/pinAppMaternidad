import { Test, TestingModule } from '@nestjs/testing';
import { CheckListItemController } from './check-list-item.controller';
import { CheckListItemService } from './check-list-item.service';

describe('CheckListItemController', () => {
  let controller: CheckListItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckListItemController],
      providers: [CheckListItemService],
    }).compile();

    controller = module.get<CheckListItemController>(CheckListItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
