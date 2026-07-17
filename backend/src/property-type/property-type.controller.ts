import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PropertyTypeService } from './property-type.service';

@Controller('property-type')
export class PropertyTypeController {
  constructor(private readonly svc: PropertyTypeService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.svc.findAllAdmin();
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(parseInt(id, 10));
  }
}
