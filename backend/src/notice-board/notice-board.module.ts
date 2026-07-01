import { Module } from '@nestjs/common';
import { NoticeBoardController } from './notice-board.controller';
import { NoticeBoardService } from './notice-board.service';

@Module({
  controllers: [NoticeBoardController],
  providers: [NoticeBoardService]
})
export class NoticeBoardModule {}
