import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { EmployeeService } from './employee.service';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly svc: EmployeeService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(parseInt(id, 10));
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
