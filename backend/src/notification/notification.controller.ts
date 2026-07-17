import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('filter') filter: 'all' | 'unread' | 'read' = 'all',
  ) {
    return this.notificationService.findAll(parseInt(page, 10), parseInt(limit, 10), filter);
  }

  @Get('recent')
  findRecent() {
    return this.notificationService.findRecent();
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
