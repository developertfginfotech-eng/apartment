import { Module } from '@nestjs/common';
import { SalaryStructureController } from './salary-structure.controller';
import { SalaryStructureService } from './salary-structure.service';

@Module({
  controllers: [SalaryStructureController],
  providers: [SalaryStructureService]
})
export class SalaryStructureModule {}
