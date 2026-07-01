import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { RenterService } from './renter.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('renters')
@UseGuards(JwtAuthGuard)
export class RenterController {
  constructor(private readonly svc: RenterService) {}
  @Get()         findAll()                                           { return this.svc.findAll(); }
  @Get(':id')    findOne(@Param('id') id: string)                    { return this.svc.findOne(+id); }
  @Post()        create(@Body() dto: any)                            { return this.svc.create(dto); }
  @Put(':id')    update(@Param('id') id: string, @Body() dto: any)  { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string)                    { return this.svc.remove(+id); }
}
