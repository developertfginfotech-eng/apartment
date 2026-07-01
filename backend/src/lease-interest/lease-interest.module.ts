import { Module } from '@nestjs/common';
import { LeaseInterestController } from './lease-interest.controller';
import { LeaseInterestService } from './lease-interest.service';

@Module({
  controllers: [LeaseInterestController],
  providers: [LeaseInterestService]
})
export class LeaseInterestModule {}
