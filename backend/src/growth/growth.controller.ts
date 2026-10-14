import { Controller, Get, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { UpdateSexDto } from './dto/update-sex.dto';

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  // Mediciones del menor + curvas de percentiles OMS + proyección
  @Get(':childId')
  findOne(@Param('childId', ParseIntPipe) childId: number) {
    return this.growthService.findOne(childId);
  }

  // Las curvas de la OMS dependen del sexo; si el menor no lo tiene se pide desde la gráfica
  @Patch(':childId/sex')
  updateSex(@Param('childId', ParseIntPipe) childId: number, @Body() updateSexDto: UpdateSexDto) {
    return this.growthService.updateSex(childId, updateSexDto);
  }
}
