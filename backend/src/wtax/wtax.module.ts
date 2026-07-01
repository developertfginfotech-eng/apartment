import { Module } from '@nestjs/common';
import { WtaxController } from './wtax.controller';
import { WtaxService } from './wtax.service';

@Module({
  controllers: [WtaxController],
  providers: [WtaxService]
})
export class WtaxModule {}
