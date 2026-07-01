import { Module } from '@nestjs/common';
import { GeneralExpenseController } from './general-expense.controller';
import { GeneralExpenseService } from './general-expense.service';

@Module({
  controllers: [GeneralExpenseController],
  providers: [GeneralExpenseService]
})
export class GeneralExpenseModule {}
