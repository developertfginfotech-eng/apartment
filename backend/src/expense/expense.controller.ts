import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private readonly svc: ExpenseService) {}
  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.findAll(from, to, search);
  }
  @Get(':id')    findOne(@Param('id') id: string)                    { return this.svc.findOne(+id); }
  @Post()        create(@Body() dto: any)                            { return this.svc.create(dto); }
  @Put(':id')    update(@Param('id') id: string, @Body() dto: any)  { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string)                    { return this.svc.remove(+id); }
}
