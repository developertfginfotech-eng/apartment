import { Controller, Get, Put, Query, Body, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly svc: RolesService) {}

  @Get('permissions/catalog')
  getCatalog() {
    return this.svc.getCatalog();
  }

  @Get('permissions')
  getGranted(@Query('role') role: string) {
    return this.svc.getGranted(role);
  }

  @Put('permissions')
  setGranted(@Query('role') role: string, @Body() body: { permissions: string[] }) {
    return this.svc.setGranted(role, body.permissions ?? []);
  }
}
