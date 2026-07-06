import { Controller, Get, Post, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { ManagePayrollService } from './manage-payroll.service';

@Controller('manage-payroll')
export class ManagePayrollController {
  constructor(private readonly svc: ManagePayrollService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }

  @Get(':id')
  show(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.show(parseInt(id, 10), { from, to, search });
  }

  @Post()
  create(@Body() body: { name: string; start_date: string; end_date: string }, @Request() req: any) {
    return this.svc.create(body, req.user?.id ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(parseInt(id, 10));
  }
}
