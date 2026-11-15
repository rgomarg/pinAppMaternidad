import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export const USER_STATUSES = ['ACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// VISIBLE: se ve en el foro. DELETED: eliminado por un admin o por su dueño.
// AUTHOR_BLOCKED: oculto porque su autor está bloqueado. HIDDEN: oculto por un reporte.
export const THREAD_STATUSES = ['VISIBLE', 'DELETED', 'AUTHOR_BLOCKED', 'HIDDEN'] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

// ?adminId= lo valida AdminGuard; aquí solo se declara para que pase la whitelist
export class AdminIdQueryDto {
  @Type(() => Number)
  @IsInt()
  adminId!: number;
}

class AdminSearchQueryDto extends AdminIdQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

// Query params de GET /admin/users
export class ListAdminUsersQueryDto extends AdminSearchQueryDto {
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}

// Query params de GET /admin/threads
export class ListAdminThreadsQueryDto extends AdminSearchQueryDto {
  @IsOptional()
  @IsIn(THREAD_STATUSES)
  status?: ThreadStatus;
}

// Los comentarios usan los mismos estados que los hilos
export type MessageStatus = ThreadStatus;

export const REPORT_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatusFilter = (typeof REPORT_STATUSES)[number];

// Query params de GET /admin/reports
export class ListAdminReportsQueryDto extends AdminSearchQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatusFilter;
}
