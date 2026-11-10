import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

// Sustituto temporal de la autenticación: el front manda ?adminId= con el usuario que
// hace la acción y aquí se comprueba en la BD que es un ADMIN activo.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ query: Record<string, unknown> }>();
    const adminId = Number(request.query.adminId);
    if (!Number.isInteger(adminId)) {
      throw new ForbiddenException('adminId is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, blockedAt: true },
    });
    if (!user || user.role !== Role.ADMIN || user.blockedAt) {
      throw new ForbiddenException('Only an administrator can perform this action');
    }
    return true;
  }
}
