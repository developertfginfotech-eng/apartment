import { Injectable, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { NotificationService } from '../notification/notification.service';

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
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  createdBy?: string;
}

function joinName(firstName: string, middleName?: string, lastName?: string): string {
  return [firstName, middleName, lastName].map(p => (p ?? '').trim()).filter(Boolean).join(' ');
}

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async onModuleInit() {
    // Retry up to 5 times with backoff — remote DB (Aiven) may need a moment on cold start
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await this.ds.query(`
          CREATE TABLE IF NOT EXISTS \`app_users\` (
            \`id\` varchar(64) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`first_name\` varchar(120) NOT NULL DEFAULT '',
            \`middle_name\` varchar(120) NOT NULL DEFAULT '',
            \`last_name\` varchar(120) NOT NULL DEFAULT '',
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
        await this.addNameColumnsIfMissing();
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

  private async addNameColumnsIfMissing() {
    // app_users pre-dates the first_name/middle_name/last_name split — add the columns
    // for tables created before this change (both EC2's local MySQL and Render's Aiven DB).
    for (const col of ['first_name', 'middle_name', 'last_name']) {
      try {
        await this.ds.query(`ALTER TABLE app_users ADD COLUMN \`${col}\` varchar(120) NOT NULL DEFAULT ''`);
      } catch {
        // column already exists — ignore
      }
    }
  }

  private async seedSuperAdmin() {
    const rows = await this.ds.query(
      'SELECT id FROM app_users WHERE email = ?',
      ['admin@apartment.local'],
    );
    if (rows.length) return;
    const hash = await bcrypt.hash('superadmin123', 10);
    await this.ds.query(
      'INSERT INTO app_users (id, name, first_name, last_name, email, password_hash, role, permissions) VALUES (?,?,?,?,?,?,?,?)',
      ['super-admin-seed', 'Super Admin', 'Super', 'Admin', 'admin@apartment.local', hash, UserRole.SUPER_ADMIN, '[]'],
    );
  }

  private mapRow(row: any): User {
    return {
      id:           row.id,
      name:         row.name,
      firstName:    row.first_name ?? '',
      middleName:   row.middle_name ?? '',
      lastName:     row.last_name ?? '',
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
    firstName: string,
    middleName: string,
    lastName: string,
    email: string,
    password: string,
    role: UserRole = UserRole.STAFF,
    permissions: Permission[] = [],
    createdBy?: string,
  ): Promise<SafeUser> {
    const lc = email.toLowerCase();
    const existing = await this.ds.query('SELECT id FROM app_users WHERE email = ?', [lc]);
    if (existing.length) throw new ConflictException('An account with this email already exists');

    const name = joinName(firstName, middleName, lastName);
    const id   = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const hash = await bcrypt.hash(password, 10);
    await this.ds.query(
      'INSERT INTO app_users (id, name, first_name, middle_name, last_name, email, password_hash, role, permissions, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, name, firstName, middleName ?? '', lastName, lc, hash, role, JSON.stringify(permissions), createdBy ?? null],
    );
    const rows = await this.ds.query('SELECT * FROM app_users WHERE id = ?', [id]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = this.mapRow(rows[0]);
    await this.notifications.notify('admin', 'New admin account created', `${name} (${lc}) was added as ${role}`);
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

  async updateAdmin(id: string, updates: { firstName?: string; middleName?: string; lastName?: string; email?: string }): Promise<SafeUser> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.firstName !== undefined || updates.middleName !== undefined || updates.lastName !== undefined) {
      const current = await this.findById(id);
      const firstName = updates.firstName ?? current?.firstName ?? '';
      const middleName = updates.middleName ?? current?.middleName ?? '';
      const lastName = updates.lastName ?? current?.lastName ?? '';
      fields.push('name = ?', 'first_name = ?', 'middle_name = ?', 'last_name = ?');
      values.push(joinName(firstName, middleName, lastName), firstName, middleName, lastName);
    }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email.toLowerCase()); }
    if (fields.length) {
      await this.ds.query(`UPDATE app_users SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    }
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    await this.notifications.notify('admin', 'Admin account updated', `${safe.name} (${safe.email}) was updated`);
    return safe;
  }

  async deleteAdmin(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.ds.query('DELETE FROM app_users WHERE id = ? AND role != ?', [id, UserRole.SUPER_ADMIN]);
    if (user) await this.notifications.notify('admin', 'Admin account deleted', `${user.name} (${user.email}) was removed`);
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
