import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { WtaxService } from './wtax.service';

@Controller('wtax')
export class WtaxController {
  constructor(private readonly svc: WtaxService) {}

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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(parseInt(id, 10));
  }
}
