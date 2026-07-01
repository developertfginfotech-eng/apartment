import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN       = 'admin',
  STAFF       = 'staff',
}

export interface Permission {
  module: string;   // e.g. 'properties', 'tenants', 'payments'
  actions: string[]; // e.g. ['read', 'create', 'update', 'delete']
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];   // custom per-admin permissions (granted by super_admin)
  createdAt: Date;
  createdBy?: string;          // id of super_admin who created this user
}

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  private readonly store = new Map<string, User>();

  constructor() {
    // Seed a default super admin so the system is usable right away
    void this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    const hash = await bcrypt.hash('superadmin123', 10);
    const sa: User = {
      id: 'super-admin-seed',
      name: 'Super Admin',
      email: 'admin@apartment.local',
      passwordHash: hash,
      role: UserRole.SUPER_ADMIN,
      permissions: [],
      createdAt: new Date(),
    };
    this.store.set(sa.email, sa);
  }

  async create(
    name: string,
    email: string,
    password: string,
    role: UserRole = UserRole.STAFF,
    permissions: Permission[] = [],
    createdBy?: string,
  ): Promise<SafeUser> {
    if (this.store.has(email.toLowerCase())) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      permissions,
      createdAt: new Date(),
      createdBy,
    };
    this.store.set(user.email, user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.store.get(email.toLowerCase());
  }

  async findById(id: string): Promise<User | undefined> {
    for (const user of this.store.values()) {
      if (user.id === id) return user;
    }
    return undefined;
  }

  async listAdmins(): Promise<SafeUser[]> {
    return [...this.store.values()]
      .filter(u => u.role === UserRole.ADMIN)
      .map(({ passwordHash: _h, ...safe }) => safe);
  }

  async updatePermissions(id: string, permissions: Permission[]): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    user.permissions = permissions;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }
}
