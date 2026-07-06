import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly svc: ReportService) {}

  @Get('property')
  property() {
    return this.svc.propertyReport();
  }

  @Get('outstanding')
  outstanding(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.outstandingLedger({ from, to, search });
  }

  @Get('financial')
  financial(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.financialReport({ from, to });
  }

  @Get('collection')
  collection(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.collectionReport({ from, to, search });
  }

  @Get('utility')
  utility(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.utilityReport({ from, to });
  }

  @Get('expenses')
  expenses(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.expensesReport({ from, to, search });
  }

  @Get('wtax-expenses')
  wtaxExpenses(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.expensesReport({ from, to, search }, true);
  }

  @Get('vat')
  vat(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.vatReport({ from, to, search });
  }

  @Get('wtax-income')
  wtaxIncome(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.wtaxIncomeReport({ from, to, search });
  }

  @Get('parking')
  parking(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.parkingReport({ from, to, search });
  }

  @Get('refund-deposit')
  refundDeposit(@Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.svc.refundDepositReport({ from, to, search });
  }
}
