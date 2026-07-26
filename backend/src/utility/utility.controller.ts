import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UtilityService } from './utility.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('utility')
@UseGuards(JwtAuthGuard)
export class UtilityController {
  constructor(private readonly svc: UtilityService) {}

  @Get()                        findAll()                                          { return this.svc.findAll(); }
  @Get('renter-by-unit/:unitId') renterByUnit(@Param('unitId') unitId: string)     { return this.svc.renterByUnit(+unitId); }
  @Get(':id')                   findOne(@Param('id') id: string)                  { return this.svc.findOne(+id); }
  @Post()                       create(@Body() body: any)                         { return this.svc.create(body); }
  @Put(':id')                   update(@Param('id') id: string, @Body() body: any) { return this.svc.update(+id, body); }
  @Delete(':id')                remove(@Param('id') id: string)                    { return this.svc.remove(+id); }
}
