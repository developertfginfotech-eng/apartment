import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

export interface MessageDto {
  from: string;
  role: 'tenant' | 'owner' | 'staff';
  subject: string;
  body: string;
}

@Injectable()
export class MessageService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`app_messages\` (
        \`id\` varchar(64) NOT NULL,
        \`from_name\` varchar(255) NOT NULL,
        \`role\` varchar(20) NOT NULL DEFAULT 'staff',
        \`subject\` varchar(255) NOT NULL,
        \`body\` text NOT NULL,
        \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      from: row.from_name,
      role: row.role,
      subject: row.subject,
      body: row.body,
      date: new Date(row.created_at).toISOString().split('T')[0],
      read: !!row.is_read,
    };
  }

  async findAll() {
    const rows = await this.ds.query('SELECT * FROM app_messages ORDER BY created_at DESC');
    return rows.map((r: any) => this.mapRow(r));
  }

  async create(dto: MessageDto) {
    const id = randomUUID();
    await this.ds.query(
      'INSERT INTO app_messages (id, from_name, role, subject, body, is_read) VALUES (?,?,?,?,?,1)',
      [id, dto.from, dto.role, dto.subject, dto.body],
    );
    const [row] = await this.ds.query('SELECT * FROM app_messages WHERE id = ?', [id]);
    return this.mapRow(row);
  }

  async markRead(id: string) {
    await this.ds.query('UPDATE app_messages SET is_read = 1 WHERE id = ?', [id]);
    return { ok: true };
  }
}
