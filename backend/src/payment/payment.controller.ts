import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly svc: PaymentService) {}

  @Get('rent-summary')
  rentSummary(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.findRentSummary(from, to, search);
  }

  @Get('lease/:leaseId/history')
  leaseHistory(@Param('leaseId') leaseId: string) {
    return this.svc.findLeaseHistory(+leaseId);
  }

  @Post('lease/:leaseId/history')
  addLeaseHistory(@Param('leaseId') leaseId: string, @Body() body: any) {
    return this.svc.createLeaseHistory(+leaseId, body);
  }

  @Get('history/:id')
  getHistoryOne(@Param('id') id: string) {
    return this.svc.findHistoryOne(+id);
  }

  @Put('history/:id')
  updateHistory(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateLeaseHistory(+id, body);
  }

  @Get('maintenance')       findMaintenance()                          { return this.svc.findMaintenance(); }
  @Put('maintenance/:id/pay') payMaintenance(@Param('id') id: string, @Body() body: any)  { return this.svc.payMaintenance(+id, body); }

  @Get('utility')       findUtility()                          { return this.svc.findUtility(); }
  @Put('utility/:id/pay') payUtility(@Param('id') id: string, @Body() body: any)  { return this.svc.payUtility(+id, body); }

  @Get('parking')          findParking()                           { return this.svc.findParking(); }
  @Put('parking/:id/pay')  payParking(@Param('id') id: string)     { return this.svc.payParking(+id); }
  @Delete('parking/:id')   removeParking(@Param('id') id: string)  { return this.svc.removeParking(+id); }

  @Get()         findAll()                                           { return this.svc.findAll(); }
  @Get(':id')    findOne(@Param('id') id: string)                    { return this.svc.findOne(+id); }
  @Post()        create(@Body() dto: any)                            { return this.svc.create(dto); }
  @Put(':id')    update(@Param('id') id: string, @Body() dto: any)  { return this.svc.update(+id, dto); }
  @Delete(':id') remove(@Param('id') id: string)                    { return this.svc.remove(+id); }
}
