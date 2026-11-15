import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
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

  @Get('guardian/:guardianId')
  findConditionsForGuardianOnDate(
    @Param('guardianId', ParseIntPipe) guardianId: number,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.conditionService.findConditionsForGuardianOnDate(guardianId, date, from, to);
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
