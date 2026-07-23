import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}
  @Get()         findAll(@Query('search') search?: string, @Query('status') status?: string) { return this.svc.findAll(search, status); }
  @Get(':id')    findOne(@Param('id') id: string)                    { return this.svc.findOne(+id); }
  @Post()        create(@Body() dto: any)                            { return this.svc.create(dto); }
  @Put(':id')    update(@Param('id') id: string, @Body() dto: any)  { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string)                    { return this.svc.remove(+id); }
}
