import { Module } from '@nestjs/common';
import { PropertyFloorController } from './property-floor.controller';
import { PropertyFloorService } from './property-floor.service';

@Module({
  controllers: [PropertyFloorController],
  providers: [PropertyFloorService]
})
export class PropertyFloorModule {}
