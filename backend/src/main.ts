import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
