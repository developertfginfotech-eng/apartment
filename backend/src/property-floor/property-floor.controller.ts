import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { PropertyFloorService } from './property-floor.service';

@Controller('property-floor')
export class PropertyFloorController {
  constructor(private readonly svc: PropertyFloorService) {}

  @Get()
  findAll(@Query('property_id') propertyId?: string) {
    return this.svc.findAll(propertyId ? parseInt(propertyId, 10) : undefined);
  }

  @Post()
  create(@Body() body: { property_id: number; name: string; area?: number }) {
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
