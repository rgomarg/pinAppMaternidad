import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminIdQueryDto, ListAdminReportsQueryDto, ListAdminThreadsQueryDto, ListAdminUsersQueryDto } from './dto/admin-query.dto';

// Panel de moderación. Todas las rutas exigen ?adminId= de un usuario con rol ADMIN.
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.adminService.findUsers(query);
  }

  @Patch('users/:id/block')
  blockUser(@Param('id', ParseIntPipe) id: number, @Query() { adminId }: AdminIdQueryDto) {
    return this.adminService.blockUser(id, adminId);
  }

  @Patch('users/:id/unblock')
  unblockUser(@Param('id', ParseIntPipe) id: number, @Query() _query: AdminIdQueryDto) {
    return this.adminService.unblockUser(id);
  }

  @Get('threads')
  findThreads(@Query() query: ListAdminThreadsQueryDto) {
    return this.adminService.findThreads(query);
  }

  @Patch('threads/:id/delete')
  deleteThread(@Param('id', ParseIntPipe) id: number, @Query() _query: AdminIdQueryDto) {
    return this.adminService.deleteThread(id);
  }

  @Patch('threads/:id/restore')
  restoreThread(@Param('id', ParseIntPipe) id: number, @Query() _query: AdminIdQueryDto) {
    return this.adminService.restoreThread(id);
  }

  @Get('reports')
  findReports(@Query() query: ListAdminReportsQueryDto) {
    return this.adminService.findReports(query);
  }

  // Aceptar el reporte: el contenido reportado queda oculto del foro
  @Patch('reports/:id/resolve')
  resolveReport(@Param('id', ParseIntPipe) id: number, @Query() _query: AdminIdQueryDto) {
    return this.adminService.resolveReport(id);
  }

  // Rechazar el reporte: el contenido sigue (o vuelve a estar) visible
  @Patch('reports/:id/dismiss')
  dismissReport(@Param('id', ParseIntPipe) id: number, @Query() _query: AdminIdQueryDto) {
    return this.adminService.dismissReport(id);
  }
}
