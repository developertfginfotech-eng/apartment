import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { SalaryStructureService } from './salary-structure.service';

@Controller('salary-structure')
export class SalaryStructureController {
  constructor(private readonly svc: SalaryStructureService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }

  @Post()
  create(@Body() body: { name: string }, @Request() req: any) {
    return this.svc.create(body.name, req.user?.id ?? null);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.svc.update(parseInt(id, 10), body.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(parseInt(id, 10));
  }
}
