import { Module } from '@nestjs/common';
import { PropertyUnitController } from './property-unit.controller';
import { PropertyUnitService } from './property-unit.service';

@Module({
  controllers: [PropertyUnitController],
  providers: [PropertyUnitService]
})
export class PropertyUnitModule {}
