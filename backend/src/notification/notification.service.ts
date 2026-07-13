import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`app_notifications\` (
        \`id\` varchar(64) NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`body\` varchar(500) NOT NULL,
        \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      read: !!row.is_read,
      createdAt: row.created_at,
    };
  }

  /** Fire-and-forget helper for other services to raise a super-admin notification. */
  async notify(type: string, title: string, body: string) {
    try {
      await this.ds.query(
        'INSERT INTO app_notifications (id, type, title, body) VALUES (?,?,?,?)',
        [randomUUID(), type, title, body],
      );
    } catch (err) {
      console.error('[NotificationService] notify failed:', err instanceof Error ? err.message : err);
    }
  }

  async findAll() {
    const rows = await this.ds.query('SELECT * FROM app_notifications ORDER BY created_at DESC LIMIT 50');
    return rows.map((r: any) => this.mapRow(r));
  }

  async unreadCount() {
    const [row] = await this.ds.query('SELECT COUNT(*) as cnt FROM app_notifications WHERE is_read = 0');
    return { count: +row.cnt };
  }

  async markRead(id: string) {
    await this.ds.query('UPDATE app_notifications SET is_read = 1 WHERE id = ?', [id]);
    return { ok: true };
  }

  async markAllRead() {
    await this.ds.query('UPDATE app_notifications SET is_read = 1 WHERE is_read = 0');
    return { ok: true };
  }
}
