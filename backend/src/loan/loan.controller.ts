import { Controller, Get, Post, Put, Delete, Param, Body, Request } from '@nestjs/common';
import { LoanService } from './loan.service';

@Controller('loan')
export class LoanController {
  constructor(private readonly svc: LoanService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
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
