import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { CheckListItemService } from './check-list-item.service';
import { CreateCheckListItemDto } from './dto/create-check-list-item.dto';
import { UpdateCheckListItemDto } from './dto/update-check-list-item.dto';

@Controller('check-list-item')
export class CheckListItemController {
  constructor(private readonly checkListItemService: CheckListItemService) {}

  @Post()
  create(@Body() createCheckListItemDto: CreateCheckListItemDto) {
    return this.checkListItemService.create(createCheckListItemDto);
  }

  @Get()
  findAll(
    @Query('childId', ParseIntPipe) childId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.checkListItemService.findAll(childId, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId', ParseIntPipe) userId: number) {
    return this.checkListItemService.findOne(+id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCheckListItemDto: UpdateCheckListItemDto) {
    return this.checkListItemService.update(+id, updateCheckListItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('userId', ParseIntPipe) userId: number) {
    return this.checkListItemService.remove(+id, userId);
  }
}
