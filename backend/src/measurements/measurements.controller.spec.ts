import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';

describe('MeasurementsController', () => {
  let controller: MeasurementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementsController],
      providers: [MeasurementsService],
    }).compile();

    controller = module.get<MeasurementsController>(MeasurementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
