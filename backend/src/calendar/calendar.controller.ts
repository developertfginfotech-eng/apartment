import { Controller, Get, Post, Delete, Param, Body, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { title: string; start: string; end?: string; description?: string }, @Request() req: any) {
    return this.svc.create({ ...body, userId: req.user?.id });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(parseInt(id, 10));
  }
}
