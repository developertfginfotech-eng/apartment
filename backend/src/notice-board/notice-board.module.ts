import { Module } from '@nestjs/common';
import { NoticeBoardController } from './notice-board.controller';
import { NoticeBoardService } from './notice-board.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [NoticeBoardController],
  providers: [NoticeBoardService]
})
export class NoticeBoardModule {}
