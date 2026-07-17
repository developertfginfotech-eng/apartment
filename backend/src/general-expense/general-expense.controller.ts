import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { GeneralExpenseService } from './general-expense.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('general-expense')
@UseGuards(JwtAuthGuard)
export class GeneralExpenseController {
  constructor(private readonly svc: GeneralExpenseService) {}
  @Get()         findAll()                                          { return this.svc.findAll(); }
  @Get(':id')    findOne(@Param('id') id: string)                   { return this.svc.findOne(+id); }
  @Post()        create(@Body() dto: any)                           { return this.svc.create(dto); }
  @Put(':id')    update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string)                   { return this.svc.remove(+id); }
}
