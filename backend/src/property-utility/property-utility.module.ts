import { Module } from '@nestjs/common';
import { PropertyUtilityController } from './property-utility.controller';
import { PropertyUtilityService } from './property-utility.service';

@Module({
  controllers: [PropertyUtilityController],
  providers: [PropertyUtilityService],
  exports: [PropertyUtilityService],
})
export class PropertyUtilityModule {}
