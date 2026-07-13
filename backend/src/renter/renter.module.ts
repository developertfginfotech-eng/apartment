import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenterController } from './renter.controller';
import { RenterService } from './renter.service';
import { Renter } from './renter.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Renter]), NotificationModule],
  controllers: [RenterController],
  providers: [RenterService],
  exports: [RenterService],
})
export class RenterModule {}
