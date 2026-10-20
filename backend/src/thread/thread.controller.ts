import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ThreadService } from './thread.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { UserIdQueryDto } from './dto/user-id-query.dto';

@Controller('thread')
export class ThreadController {
  constructor(private readonly threadService: ThreadService) {}

  @Post()
  create(@Body() createThreadDto: CreateThreadDto) {
    return this.threadService.create(createThreadDto);
  }

  @Get()
  findAll(@Query() query: ListThreadsQueryDto) {
    return this.threadService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Query() { userId }: UserIdQueryDto) {
    return this.threadService.findOne(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateThreadDto: UpdateThreadDto) {
    return this.threadService.update(+id, updateThreadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.threadService.remove(+id);
  }
}
