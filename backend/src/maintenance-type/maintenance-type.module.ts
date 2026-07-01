import { Module } from '@nestjs/common';
import { MaintenanceTypeController } from './maintenance-type.controller';
import { MaintenanceTypeService } from './maintenance-type.service';

@Module({
  controllers: [MaintenanceTypeController],
  providers: [MaintenanceTypeService]
})
export class MaintenanceTypeModule {}
