import { Module } from '@nestjs/common';
import { ManagePayrollController } from './manage-payroll.controller';
import { ManagePayrollService } from './manage-payroll.service';

@Module({
  controllers: [ManagePayrollController],
  providers: [ManagePayrollService]
})
export class ManagePayrollModule {}
