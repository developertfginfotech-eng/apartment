import { Controller, Get, UseGuards } from '@nestjs/common';
import { PropertyUtilityService } from './property-utility.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('property-utility')
@UseGuards(JwtAuthGuard)
export class PropertyUtilityController {
  constructor(private readonly svc: PropertyUtilityService) {}
  @Get() findAll() { return this.svc.findAll(); }
}
