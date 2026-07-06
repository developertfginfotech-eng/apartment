import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../common/roles.guard';
import { ActivityLogModule } from '../activity-log/activity-log.module';

// JwtModule is registered globally in app.module.ts — no local registration needed
@Module({
  imports: [UsersModule, ActivityLogModule],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
