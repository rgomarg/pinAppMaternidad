import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';

@Controller('measurements')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post()
  create(@Body() createMeasurementDto: CreateMeasurementDto) {
    return this.measurementsService.create(createMeasurementDto);
  }

  @Get()
  findAll() {
    return this.measurementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.measurementsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMeasurementDto: UpdateMeasurementDto) {
    return this.measurementsService.update(+id, updateMeasurementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.measurementsService.remove(+id);
  }
}
