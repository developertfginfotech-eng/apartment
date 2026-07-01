import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenterController } from './renter.controller';
import { RenterService } from './renter.service';
import { Renter } from './renter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Renter])],
  controllers: [RenterController],
  providers: [RenterService],
  exports: [RenterService],
})
export class RenterModule {}
