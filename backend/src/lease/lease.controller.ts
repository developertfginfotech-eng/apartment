import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { LeaseService } from './lease.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('leases')
@UseGuards(JwtAuthGuard)
export class LeaseController {
  constructor(private readonly svc: LeaseService) {}
  @Get('summary') findSummary(@Query('status') status = '1', @Query('search') search?: string) {
    return this.svc.findSummary(parseInt(status, 10), search);
  }
  @Get()         findAll()                                           { return this.svc.findAll(); }
  @Get(':id')    findOne(@Param('id') id: string)                    { return this.svc.findOne(+id); }
  @Post()        create(@Body() dto: any)                            { return this.svc.create(dto); }
  @Put(':id')    update(@Param('id') id: string, @Body() dto: any)  { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string)                    { return this.svc.remove(+id); }
}
