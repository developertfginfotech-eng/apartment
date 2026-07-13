import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NoticeBoardService } from './notice-board.service';
import type { NoticeDto } from './notice-board.service';

@Controller('notice-board')
export class NoticeBoardController {
  constructor(private readonly svc: NoticeBoardService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.svc.findAll(limit ? Number(limit) : undefined);
  }

  @Post()
  create(@Body() body: NoticeDto) {
    return this.svc.create(body);
  }
}
