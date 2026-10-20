import { Controller, Post, Body, Param, Delete, Query, ParseIntPipe, HttpCode } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { LikeMessageDto } from './dto/like-message.dto';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.create(createMessageDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Query('userId', ParseIntPipe) userId: number) {
    return this.messageService.remove(id, userId);
  }

  @Post(':id/like')
  @HttpCode(200)
  like(@Param('id', ParseIntPipe) id: number, @Body() { userId }: LikeMessageDto) {
    return this.messageService.like(id, userId);
  }

  @Delete(':id/like')
  unlike(@Param('id', ParseIntPipe) id: number, @Query('userId', ParseIntPipe) userId: number) {
    return this.messageService.unlike(id, userId);
  }
}
