import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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
  findAll() {
    return this.checkListItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkListItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCheckListItemDto: UpdateCheckListItemDto) {
    return this.checkListItemService.update(+id, updateCheckListItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.checkListItemService.remove(+id);
  }
}
