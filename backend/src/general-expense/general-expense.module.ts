import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralExpenseController } from './general-expense.controller';
import { GeneralExpenseService } from './general-expense.service';
import { GeneralExpense } from './general-expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GeneralExpense])],
  controllers: [GeneralExpenseController],
  providers: [GeneralExpenseService],
  exports: [GeneralExpenseService],
})
export class GeneralExpenseModule {}
