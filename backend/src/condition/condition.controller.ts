import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConditionService } from './condition.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';

@Controller('condition')
export class ConditionController {
  constructor(private readonly conditionService: ConditionService) {}

  @Post()
  create(@Body() createConditionDto: CreateConditionDto) {
    return this.conditionService.create(createConditionDto);
  }

  @Get()
  findAll() {
    return this.conditionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conditionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConditionDto: UpdateConditionDto) {
    return this.conditionService.update(+id, updateConditionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conditionService.remove(+id);
  }
}
