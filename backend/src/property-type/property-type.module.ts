import { Module } from '@nestjs/common';
import { PropertyTypeController } from './property-type.controller';
import { PropertyTypeService } from './property-type.service';

@Module({
  controllers: [PropertyTypeController],
  providers: [PropertyTypeService]
})
export class PropertyTypeModule {}
