import { Module } from '@nestjs/common';
import { LeaseUnitController } from './lease-unit.controller';
import { LeaseUnitService } from './lease-unit.service';

@Module({
  controllers: [LeaseUnitController],
  providers: [LeaseUnitService]
})
export class LeaseUnitModule {}
