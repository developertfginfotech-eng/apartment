import { Controller, Get } from '@nestjs/common';
import { PropertyTypeService } from './property-type.service';

@Controller('property-type')
export class PropertyTypeController {
  constructor(private readonly svc: PropertyTypeService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }
}
