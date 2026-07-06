import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { PropertyUnitService } from './property-unit.service';

@Controller('property-unit')
export class PropertyUnitController {
  constructor(private readonly svc: PropertyUnitService) {}

  @Get()
  findAll(@Query('property_id') propertyId?: string, @Query('floor_id') floorId?: string) {
    return this.svc.findAll({
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      floorId: floorId ? parseInt(floorId, 10) : undefined,
    });
  }

  @Post()
  create(@Body() body: { property_id: number; floor_id: number; name: string; area?: number }) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; area?: number }) {
    return this.svc.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(parseInt(id, 10));
  }
}
