// Carga backend/.env (GEMINI_API_KEY, GEMINI_MODEL) antes que el resto de módulos
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // La foto de perfil se envía como data URI (base64); el límite por defecto (100kb) se queda corto
  app.useBodyParser('json', { limit: '10mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ¡Magia de seguridad! Elimina cualquier dato extra que envíe un hacker y que no esté definido en el DTO
      forbidNonWhitelisted: true, // Lanza un error si alguien envía datos que no tocan
      transform: true, // Transforma los datos entrantes a los tipos definidos en el DTO
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
