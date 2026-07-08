import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UsersService, UserRole } from '../users/users.service';

// Maps a controller's route prefix to the module key used in the Admin
// Management "module access" picker. Prefixes not listed here are left
// ungated (e.g. auth, document, calendar, dashboard, users, roles).
const MODULE_BY_PREFIX: Record<string, string> = {
  properties: 'properties',
  'property-unit': 'properties',
  'property-floor': 'properties',
  'property-type': 'properties',
  landlords: 'owners',
  renters: 'tenants',
  leases: 'leases',
  'lease-unit': 'leases',
  'lease-utility': 'leases',
  'lease-interest': 'leases',
  payments: 'payments',
  parking: 'payments',
  maintenance: 'maintenance',
  'maintenance-type': 'maintenance',
  expense: 'expenses',
  'expense-type': 'expenses',
  'general-expense': 'expenses',
  utility: 'utilities',
  'notice-board': 'notice-board',
  message: 'messages',
  report: 'reports',
  'activity-log': 'activity-logs',
  loan: 'loan',
  'security-money': 'security-money',
  payroll: 'payroll',
  'manage-payroll': 'payroll',
  'salary-structure': 'payroll',
  employee: 'payroll',
  tax: 'taxes',
  wtax: 'taxes',
  setting: 'settings',
};

@Injectable()
export class ModulePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector, private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const payload = (request as unknown as { user?: { sub?: string } }).user;
    if (!payload?.sub) return true; // no auth context here — JwtAuthGuard already handles rejecting it

    const prefix = request.path.split('/').filter(Boolean)[0] ?? '';
    const moduleKey = MODULE_BY_PREFIX[prefix];
    if (!moduleKey) return true; // ungated route

    const user = await this.usersService.findById(payload.sub);
    if (!user) return true;
    if (user.role === UserRole.SUPER_ADMIN) return true;

    const allowed = user.permissions.some(p => p.module === moduleKey);
    if (!allowed) throw new ForbiddenException('You are not authorized to access this module.');
    return true;
  }
}
