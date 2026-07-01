import { Module } from '@nestjs/common';
import { ExpenseTypeController } from './expense-type.controller';
import { ExpenseTypeService } from './expense-type.service';

@Module({
  controllers: [ExpenseTypeController],
  providers: [ExpenseTypeService]
})
export class ExpenseTypeModule {}
