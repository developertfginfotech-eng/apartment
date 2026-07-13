import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandlordController } from './landlord.controller';
import { LandlordService } from './landlord.service';
import { Landlord } from './landlord.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Landlord]), NotificationModule],
  controllers: [LandlordController],
  providers: [LandlordService],
})
export class LandlordModule {}
