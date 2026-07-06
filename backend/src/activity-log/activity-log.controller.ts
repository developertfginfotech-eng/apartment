import { Controller, Get, Query } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';

@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly svc: ActivityLogService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll({ page: parseInt(page, 10), limit: parseInt(limit, 10), role, search });
  }

  @Get('roles')
  getRoles() {
    return this.svc.getRoles();
  }
}
