import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Filtros de la vista pública del foro. Se aplican en cada consulta, así que en cuanto
// un admin elimina un hilo o bloquea a un usuario su contenido deja de salir al instante
// (sin cachés ni tareas programadas), y vuelve a salir tal cual si se restaura.

// Hilo visible: no oculto por reporte, no eliminado y cuyo autor no está bloqueado
export const visibleThreadWhere = {
  isHidden: false,
  deletedAt: null,
  owner: { blockedAt: null },
} satisfies Prisma.ThreadWhereInput;

// Mensaje visible: no oculto por reporte y cuyo autor no está bloqueado
export const visibleMessageWhere = {
  isHidden: false,
  author: { blockedAt: null },
} satisfies Prisma.MessageWhereInput;

// Un usuario bloqueado no puede publicar ni interactuar en el foro
export function assertNotBlocked(user: { blockedAt: Date | null }) {
  if (user.blockedAt) {
    throw new ForbiddenException('This user is blocked');
  }
}
