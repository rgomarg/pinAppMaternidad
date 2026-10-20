import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { RegisterTokenDto } from './dto/register-tokenDto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // POST /notifications/token -> Registrar el pushToken del móvil
  @Post('token')
  registerPushToken(@Body() registerTokenDto: RegisterTokenDto) {
    return this.notificationsService.registerPushToken(registerTokenDto);
  }

  // POST /notifications -> Crear una notificación
  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  // GET /notifications/user/:userId -> Listar el historial de notificaciones del usuario
  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.findByUser(userId);
  }

  // GET /notifications -> Listar todas
  @Get()
  findAll() {
    return this.notificationsService.findAll();
  }

  // GET /notifications/:id -> Ver una en específico
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOne(id);
  }

  // PATCH /notifications/:id -> Modificar una notificación
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  // DELETE /notifications/:id -> Borrar una notificación
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.remove(id);
  }
}