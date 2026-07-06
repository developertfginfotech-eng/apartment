import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  @Get()
  findAll(
    @Query('page')  page  = '1',
    @Query('limit') limit = '50',
    @Query('month') month?: string,
    @Query('from')  from?:  string,
    @Query('to')    to?:    string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      month, from, to, search,
    });
  }

  @Get('debug')
  debug() {
    return this.svc.debug();
  }

  @Get('employees')
  getEmployees() {
    return this.svc.getEmployees();
  }

  @Get('signatories')
  getSignatories() {
    return this.svc.getSignatories();
  }

  @Get('payslip')
  findPayslipList(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findPayslipList({ from, to, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(parseInt(id, 10));
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create({ ...body, user_id: req.user?.id });
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
