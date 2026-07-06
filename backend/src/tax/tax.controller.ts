import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { TaxService } from './tax.service';

@Controller('tax')
export class TaxController {
  constructor(private readonly svc: TaxService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(parseInt(id, 10), body);
  }
}
