import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { NoticeBoardService } from './notice-board.service';
import type { NoticeDto } from './notice-board.service';

@Controller('notice-board')
export class NoticeBoardController {
  constructor(private readonly svc: NoticeBoardService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.svc.findAll(limit ? Number(limit) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() body: NoticeDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: NoticeDto) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
