import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingService } from './setting.service';

@Controller('setting')
export class SettingController {
  constructor(private readonly svc: SettingService) {}

  @Get()
  get() {
    return this.svc.get();
  }

  @Put()
  update(@Body() dto: any) {
    return this.svc.update(dto);
  }
}
