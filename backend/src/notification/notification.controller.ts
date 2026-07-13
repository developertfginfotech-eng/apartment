import { Controller, Get, Patch, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll() {
    return this.notificationService.findAll();
  }

  @Get('unread-count')
  unreadCount() {
    return this.notificationService.unreadCount();
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Patch('read-all')
  markAllRead() {
    return this.notificationService.markAllRead();
  }
}
