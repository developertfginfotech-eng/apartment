import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ActivityLogService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll(params: { page: number; limit: number; role?: string; search?: string }) {
    const { page = 1, limit = 50, role, search } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];

    if (role) {
      conditions.push('r.name = ?');
      bindings.push(role);
    }
    if (search) {
      conditions.push('(a.description LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countResult] = await this.ds.query(
      `SELECT COUNT(*) as total FROM activity_log a
       LEFT JOIN users u ON u.id = a.causer_id AND a.causer_type LIKE '%User%'
       LEFT JOIN tbl_user_roles r ON r.id = u.role_id
       ${where}`,
      bindings,
    );

    const rows = await this.ds.query(
      `SELECT
         a.id, a.description, a.event, a.subject_type, a.created_at,
         TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name,
         r.name AS role_name
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.causer_id AND a.causer_type LIKE '%User%'
       LEFT JOIN tbl_user_roles r ON r.id = u.role_id
       ${where}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...bindings, limit, offset],
    );

    return {
      data: rows,
      total: parseInt(countResult.total, 10),
      page,
      limit,
      pages: Math.ceil(parseInt(countResult.total, 10) / limit),
    };
  }

  async getRoles() {
    return this.ds.query(
      `SELECT DISTINCT name FROM tbl_user_roles WHERE name IS NOT NULL AND name <> '' ORDER BY name ASC`,
    );
  }

  async record(description: string, userName?: string) {
    await this.ds.query(
      `INSERT INTO activity_log (log_name, description, causer_type, properties, created_at, updated_at)
       VALUES ('default', ?, 'AppUser', JSON_OBJECT('user', ?), NOW(), NOW())`,
      [description, userName ?? null],
    );
  }
}
