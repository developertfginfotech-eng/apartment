import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { Setting } from './setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingController],
  providers: [SettingService],
})
export class SettingModule {}
