import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

export interface NoticeDto {
  title: string;
  desc: string;
  recipient: 'All' | 'Tenants' | 'Owners' | 'Staff';
  sender?: string;
}

@Injectable()
export class NoticeBoardService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`app_notices\` (
        \`id\` varchar(64) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NOT NULL,
        \`recipient\` varchar(20) NOT NULL DEFAULT 'All',
        \`sender\` varchar(255) NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'active',
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      title: row.title,
      desc: row.description,
      recipient: row.recipient,
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
      'INSERT INTO app_notices (id, title, description, recipient, sender, status) VALUES (?,?,?,?,?,?)',
      [id, dto.title, dto.desc, dto.recipient, dto.sender ?? null, 'active'],
    );
    const [row] = await this.ds.query('SELECT * FROM app_notices WHERE id = ?', [id]);
    return this.mapRow(row);
  }
}
