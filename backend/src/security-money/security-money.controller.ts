import { Controller, Get, Post, Param, Body, Query, Request } from '@nestjs/common';
import { SecurityMoneyService } from './security-money.service';

@Controller('security-money')
export class SecurityMoneyController {
  constructor(private readonly svc: SecurityMoneyService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
  ) {
    return this.svc.findAll({ page: parseInt(page, 10), limit: parseInt(limit, 10), search });
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.svc.getHistory(parseInt(id, 10));
  }

  @Post(':id/history')
  addTransaction(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.addTransaction(parseInt(id, 10), body, req.user?.id ?? null);
  }
}
