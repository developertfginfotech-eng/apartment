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
    await this.backfillRawDateBodies();
  }

  /**
   * One-time, idempotent cleanup: early lease_expiring notifications embedded a raw
   * JS Date.toString() (e.g. "Mon Aug 31 2026 00:00:00 GMT+0000 (...)") in the body
   * before the cron was fixed to format it. Reformats any it finds; no-ops once clean.
   */
  private async backfillRawDateBodies() {
    try {
      const rows = await this.ds.query(
        `SELECT id, body FROM app_notifications WHERE type = 'lease_expiring' AND body LIKE '%GMT%'`,
      );
      for (const row of rows) {
        const m = row.body.match(/^(.*ends on )(.+)$/);
        if (!m) continue;
        const parsed = new Date(m[2]);
        if (Number.isNaN(parsed.getTime())) continue;
        const label = parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const newBody = m[1] + label;
        if (newBody !== row.body) {
          await this.ds.query('UPDATE app_notifications SET body = ? WHERE id = ?', [newBody, row.id]);
        }
      }
    } catch (err) {
      console.error('[NotificationService] backfillRawDateBodies failed:', err instanceof Error ? err.message : err);
    }
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

  async findAll(page = 1, limit = 20, filter: 'all' | 'unread' | 'read' = 'all') {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;
    const where = filter === 'unread' ? 'WHERE is_read = 0' : filter === 'read' ? 'WHERE is_read = 1' : '';

    const [rows, [{ cnt }]] = await Promise.all([
      this.ds.query(`SELECT * FROM app_notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [safeLimit, offset]),
      this.ds.query(`SELECT COUNT(*) as cnt FROM app_notifications ${where}`),
    ]);

    return {
      data: rows.map((r: any) => this.mapRow(r)),
      total: +cnt,
      page: safePage,
      pages: Math.max(1, Math.ceil(+cnt / safeLimit)),
    };
  }

  /** Small, fixed-size preview list for the header bell dropdown — never paginated. */
  async findRecent(limit = 8) {
    const rows = await this.ds.query('SELECT * FROM app_notifications ORDER BY created_at DESC LIMIT ?', [limit]);
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
