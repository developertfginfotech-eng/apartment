import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { NotificationService } from '../notification/notification.service';

export interface NoticeDto {
  title: string;
  desc: string;
  recipient: string;
  attachment?: string | null;
  sender?: string;
  status?: 'active' | 'inactive';
}

const NEW_COLUMNS: { name: string; ddl: string }[] = [
  { name: 'attachment', ddl: 'ADD COLUMN attachment varchar(255) NULL AFTER recipient' },
];

@Injectable()
export class NoticeBoardService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`app_notices\` (
        \`id\` varchar(64) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NOT NULL,
        \`recipient\` varchar(100) NOT NULL DEFAULT 'All',
        \`sender\` varchar(255) NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'active',
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
    for (const col of NEW_COLUMNS) {
      const cols = await this.ds.query('SHOW COLUMNS FROM app_notices LIKE ?', [col.name]);
      if (!cols.length) {
        await this.ds.query(`ALTER TABLE app_notices ${col.ddl}`);
      }
    }
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      title: row.title,
      desc: row.description,
      recipient: row.recipient,
      attachment: row.attachment ?? null,
      sender: row.sender,
      status: row.status,
      date: new Date(row.created_at).toISOString().split('T')[0],
    };
  }

  async findAll(limit?: number) {
    const rows = await this.ds.query(
      `SELECT * FROM app_notices ORDER BY created_at DESC${limit ? ` LIMIT ${Number(limit)}` : ''}`,
    );
    return rows.map((r: any) => this.mapRow(r));
  }

  async create(dto: NoticeDto) {
    const id = randomUUID();
    await this.ds.query(
      'INSERT INTO app_notices (id, title, description, recipient, attachment, sender, status) VALUES (?,?,?,?,?,?,?)',
      [id, dto.title, dto.desc, dto.recipient, dto.attachment ?? null, dto.sender ?? null, dto.status ?? 'active'],
    );
    const [row] = await this.ds.query('SELECT * FROM app_notices WHERE id = ?', [id]);
    await this.notifications.notify('notice', 'New notice posted', dto.title);
    return this.mapRow(row);
  }

  async findOne(id: string) {
    const [row] = await this.ds.query('SELECT * FROM app_notices WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, dto: NoticeDto) {
    await this.ds.query(
      'UPDATE app_notices SET title = ?, description = ?, recipient = ?, attachment = ?, status = ? WHERE id = ?',
      [dto.title, dto.desc, dto.recipient, dto.attachment ?? null, dto.status ?? 'active', id],
    );
    const [row] = await this.ds.query('SELECT * FROM app_notices WHERE id = ?', [id]);
    await this.notifications.notify('notice', 'Notice updated', dto.title);
    return row ? this.mapRow(row) : null;
  }

  async remove(id: string) {
    await this.ds.query('DELETE FROM app_notices WHERE id = ?', [id]);
    return { success: true };
  }
}
