import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CalendarService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_calendar\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` varchar(64),
        \`title\` varchar(255) NOT NULL,
        \`start\` date NOT NULL,
        \`end\` date,
        \`description\` text,
        \`className\` varchar(64),
        \`status\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `).catch(() => {});
  }

  findAll() {
    return this.ds.query(
      `SELECT id, title, start, end, description, className FROM tbl_calendar WHERE status = 1 ORDER BY start ASC`
    );
  }

  create(body: { title: string; start: string; end?: string; description?: string; userId?: string }) {
    return this.ds.query(
      `INSERT INTO tbl_calendar (user_id, title, start, end, description, status) VALUES (?, ?, ?, ?, ?, 1)`,
      [body.userId ?? null, body.title, body.start, body.end ?? null, body.description ?? null]
    );
  }

  remove(id: number) {
    return this.ds.query(`UPDATE tbl_calendar SET status = 0 WHERE id = ?`, [id]);
  }
}
