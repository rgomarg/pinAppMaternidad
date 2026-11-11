import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateEventDto } from './create-event.dto';
import { CreateNotificationDto } from '../../notifications/dto/create-notification.dto';

// Misma configuración de validación que src/main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validar = (metatype: any, body: object) => pipe.transform(body, { type: 'body', metatype });

// RF-01: validación de la entrada al registrar un evento y su recordatorio.
describe('Validación de entrada (RF-01)', () => {
  describe('CreateEventDto', () => {
    const valido = { title: 'Cita', date: '2099-03-15T09:30:00.000Z', childId: 3 };

    it('acepta un evento válido y convierte la fecha y el childId', async () => {
      const dto = await validar(CreateEventDto, { ...valido, childId: '3' });
      expect(dto.date).toBeInstanceOf(Date);
      expect(dto.childId).toBe(3);
    });

    it.each([
      ['sin título', { title: undefined }],
      ['título vacío', { title: '' }],
      ['fecha inválida', { date: 'no-es-fecha' }],
      ['sin menor', { childId: undefined }],
      ['tipo inexistente', { type: 'FIESTA' }],
      ['notification no booleano', { notification: 'si' }],
      ['campo no permitido', { hacker: 1 }],
    ])('rechaza %s', async (_caso, cambio) => {
      await expect(validar(CreateEventDto, { ...valido, ...cambio })).rejects.toThrow(BadRequestException);
    });

    it('rechaza un recordatorio en una fecha pasada', async () => {
      await expect(
        validar(CreateEventDto, { ...valido, date: '2020-01-01T10:00:00.000Z', notification: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CreateNotificationDto', () => {
    it('acepta el recordatorio que envía la app (registerBackendNotification)', async () => {
      const body = {
        title: 'Cita médica: Revisión',
        body: 'Evento para Leo',
        scheduledAt: '2099-03-15T09:00:00.000Z',
        userId: 26,
        type: 'EVENT',
        eventId: 88,
        data: { screen: 'Calendario', id: 88, type: 'EVENT' },
      };
      await expect(validar(CreateNotificationDto, body)).resolves.toBeDefined();
    });
  });
});
