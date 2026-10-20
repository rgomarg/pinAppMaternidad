import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

@Controller('medicine')
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Post()
  create(@Body() createMedicineDto: CreateMedicineDto) {
    return this.medicineService.create(createMedicineDto);
  }

  @Get()
  findAll() {
    return this.medicineService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicineService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMedicineDto: UpdateMedicineDto) {
    return this.medicineService.update(+id, updateMedicineDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicineService.remove(+id);
  }

  @Get('guardian/:guardianId')
  findMedicineForGuardianOnDate(
    @Param('guardianId', ParseIntPipe) guardianId: number,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.medicineService.findMedicineForGuardianOnDate(guardianId, date, from, to);
  }
}
