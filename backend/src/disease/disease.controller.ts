import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DiseaseService } from './disease.service';
import { CreateDiseaseDto } from './dto/create-disease.dto';
import { UpdateDiseaseDto } from './dto/update-disease.dto';

@Controller('disease')
export class DiseaseController {
  constructor(private readonly diseaseService: DiseaseService) {}

  @Post()
  create(@Body() createDiseaseDto: CreateDiseaseDto) {
    return this.diseaseService.create(createDiseaseDto);
  }

@Get()
  findAll(@Query('childId') childId?: string) {
  return this.diseaseService.findAll(childId ? +childId : undefined);
}


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diseaseService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDiseaseDto: UpdateDiseaseDto) {
    return this.diseaseService.update(+id, updateDiseaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diseaseService.remove(+id);
  }
}
