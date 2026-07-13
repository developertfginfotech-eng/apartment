import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MessageService } from './message.service';
import type { MessageDto } from './message.service';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  findAll() {
    return this.messageService.findAll();
  }

  @Post()
  create(@Body() dto: MessageDto) {
    return this.messageService.create(dto);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.messageService.markRead(id);
  }
}
