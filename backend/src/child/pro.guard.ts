import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';


@Injectable()
export class ProGuard implements CanActivate {
  
  constructor(private readonly prisma: PrismaService) {};

  async canActivate(context: ExecutionContext): Promise<boolean>  {
    const request = context.switchToHttp().getRequest<{ query: Record<string, unknown> }>();
    const proId = Number(request.query.proId);

    if (!Number.isInteger(proId)) {
      throw new ForbiddenException('proId is required');
    }

    const user = await this.prisma.user.findUnique({
      where: {id:proId},
      select: { role: true, blockedAt: true }
    });

    if (!user ||  user.role !== Role.PRO || user.blockedAt) {
          throw new ForbiddenException('Only PRO users can perform this action');
        }

    return true;
  }
}
