import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, UseGuards } from '@nestjs/common';
import { ThreadService } from './thread.service';
import { ThreadSummaryService } from './thread-summary.service';
import { ProGuard } from '../child/pro.guard';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { UserIdQueryDto } from './dto/user-id-query.dto';

@Controller('thread')
export class ThreadController {
  constructor(
    private readonly threadService: ThreadService,
    private readonly threadSummaryService: ThreadSummaryService,
  ) {}

  // Resumen del hilo con IA (solo usuarios PRO). ProGuard lee ?proId=
  @UseGuards(ProGuard)
  @Post(':id/summary')
  summarize(@Param('id', ParseIntPipe) id: number) {
    // El resumen se comparte entre usuarios; proId solo lo usa ProGuard para comprobar que es PRO
    return this.threadSummaryService.summarize(id);
  }

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
  update(@Param('id', ParseIntPipe) id: number, @Body() updateThreadDto: UpdateThreadDto) {
    return this.threadService.update(id, updateThreadDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Query('userId', ParseIntPipe) userId: number) {
    return this.threadService.remove(id, userId);
  }
}
