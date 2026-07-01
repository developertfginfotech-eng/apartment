import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../common/roles.guard';

// JwtModule is registered globally in app.module.ts — no local registration needed
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
