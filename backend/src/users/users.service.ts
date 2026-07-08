import { Injectable, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN       = 'admin',
  STAFF       = 'staff',
}

export interface Permission {
  module: string;
  actions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  createdBy?: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    // Retry up to 5 times with backoff — remote DB (Aiven) may need a moment on cold start
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await this.ds.query(`
          CREATE TABLE IF NOT EXISTS \`app_users\` (
            \`id\` varchar(64) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`email\` varchar(255) NOT NULL,
            \`password_hash\` varchar(255) NOT NULL,
            \`role\` varchar(50) NOT NULL DEFAULT 'staff',
            \`permissions\` json,
            \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`created_by\` varchar(64),
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`uq_app_users_email\` (\`email\`)
          )
        `);
        await this.seedSuperAdmin();
        console.log('[UsersService] app_users table ready');
        return;
      } catch (err) {
        console.error(`[UsersService] init attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
        if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
    // Log but don't crash — DB may be temporarily unavailable
    console.error('[UsersService] Could not initialize app_users table after 5 attempts');
  }

  private async seedSuperAdmin() {
    const rows = await this.ds.query(
      'SELECT id FROM app_users WHERE email = ?',
      ['admin@apartment.local'],
    );
    if (rows.length) return;
    const hash = await bcrypt.hash('superadmin123', 10);
    await this.ds.query(
      'INSERT INTO app_users (id, name, email, password_hash, role, permissions) VALUES (?,?,?,?,?,?)',
      ['super-admin-seed', 'Super Admin', 'admin@apartment.local', hash, UserRole.SUPER_ADMIN, '[]'],
    );
  }

  private mapRow(row: any): User {
    return {
      id:           row.id,
      name:         row.name,
      email:        row.email,
      passwordHash: row.password_hash,
      role:         row.role as UserRole,
      permissions:  typeof row.permissions === 'string'
                      ? JSON.parse(row.permissions)
                      : (row.permissions ?? []),
      createdAt:    row.created_at,
      createdBy:    row.created_by ?? undefined,
    };
  }

  async create(
    name: string,
    email: string,
    password: string,
    role: UserRole = UserRole.STAFF,
    permissions: Permission[] = [],
    createdBy?: string,
  ): Promise<SafeUser> {
    const lc = email.toLowerCase();
    const existing = await this.ds.query('SELECT id FROM app_users WHERE email = ?', [lc]);
    if (existing.length) throw new ConflictException('An account with this email already exists');

    const id   = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const hash = await bcrypt.hash(password, 10);
    await this.ds.query(
      'INSERT INTO app_users (id, name, email, password_hash, role, permissions, created_by) VALUES (?,?,?,?,?,?,?)',
      [id, name, lc, hash, role, JSON.stringify(permissions), createdBy ?? null],
    );
    const rows = await this.ds.query('SELECT * FROM app_users WHERE id = ?', [id]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = this.mapRow(rows[0]);
    return safe;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.ds.query('SELECT * FROM app_users WHERE email = ?', [email.toLowerCase()]);
    return rows.length ? this.mapRow(rows[0]) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const rows = await this.ds.query('SELECT * FROM app_users WHERE id = ?', [id]);
    return rows.length ? this.mapRow(rows[0]) : undefined;
  }

  async listAdmins(): Promise<SafeUser[]> {
    const rows = await this.ds.query(
      'SELECT * FROM app_users WHERE role IN (?,?) ORDER BY name ASC',
      [UserRole.ADMIN, UserRole.STAFF],
    );
    return rows.map((r: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _h, ...safe } = this.mapRow(r);
      return safe;
    });
  }

  async updatePermissions(id: string, permissions: Permission[]): Promise<SafeUser> {
    await this.ds.query('UPDATE app_users SET permissions = ? WHERE id = ?', [JSON.stringify(permissions), id]);
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  async updateAdmin(id: string, updates: { name?: string; email?: string }): Promise<SafeUser> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email.toLowerCase()); }
    if (fields.length) {
      await this.ds.query(`UPDATE app_users SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    }
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  async deleteAdmin(id: string): Promise<void> {
    await this.ds.query('DELETE FROM app_users WHERE id = ? AND role != ?', [id, UserRole.SUPER_ADMIN]);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.ds.query('UPDATE app_users SET password_hash = ? WHERE id = ?', [hash, id]);
  }

  async resetPasswordByEmail(email: string, newPassword: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;
    await this.updatePassword(user.id, newPassword);
    return true;
  }
}
