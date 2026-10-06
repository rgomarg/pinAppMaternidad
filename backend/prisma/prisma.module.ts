import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() //Servicio disponible en toda la carpeta del proyecto
@Module({
  providers: [PrismaService], // Este módulo tiene el servicio PrismaService
  exports: [PrismaService],   // Exportar el servicio PrismaService para que otros módulos lo puedan usar
})
export class PrismaModule {}