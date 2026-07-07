import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { LandlordService } from './landlord.service';

@Controller('landlords')
export class LandlordController {
  constructor(private readonly svc: LandlordService) {}
  @Get()          findAll()                            { return this.svc.findAll(); }
  @Get('countries') getCountries()                     { return this.svc.getCountries(); }
  @Get(':id')     findOne(@Param('id') id: string)     { return this.svc.findOne(+id); }
  @Post()         create(@Body() dto: any)             { return this.svc.create(dto); }
  @Put(':id')     update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(+id, dto); }
  @Delete(':id')  remove(@Param('id') id: string)     { return this.svc.remove(+id); }
}
