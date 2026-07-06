import { Controller, Get } from '@nestjs/common';
import { MaintenanceTypeService } from './maintenance-type.service';

@Controller('maintenance-type')
export class MaintenanceTypeController {
  constructor(private readonly svc: MaintenanceTypeService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }
}
