import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { user } = context.switchToHttp().getRequest<any>();
    if (!user?.role) throw new ForbiddenException('Access denied');

    const allowed = required.includes(user.role as UserRole);
    if (!allowed) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
