import { Module } from '@nestjs/common';
import { SecurityMoneyController } from './security-money.controller';
import { SecurityMoneyService } from './security-money.service';

@Module({
  controllers: [SecurityMoneyController],
  providers: [SecurityMoneyService]
})
export class SecurityMoneyModule {}
