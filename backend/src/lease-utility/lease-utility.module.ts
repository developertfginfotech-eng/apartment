import { Module } from '@nestjs/common';
import { LeaseUtilityController } from './lease-utility.controller';
import { LeaseUtilityService } from './lease-utility.service';

@Module({
  controllers: [LeaseUtilityController],
  providers: [LeaseUtilityService]
})
export class LeaseUtilityModule {}
