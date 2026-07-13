import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class TodoService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`app_todos\` (
        \`id\` varchar(64) NOT NULL,
        \`user_id\` varchar(64) NULL,
        \`text\` varchar(500) NOT NULL,
        \`is_done\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      text: row.text,
      done: !!row.is_done,
      date: new Date(row.created_at).toISOString().split('T')[0],
    };
  }

  async findAllForUser(userId: string) {
    const rows = await this.ds.query(
      'SELECT * FROM app_todos WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    return rows.map((r: any) => this.mapRow(r));
  }

  async create(userId: string, text: string) {
    const id = randomUUID();
    await this.ds.query(
      'INSERT INTO app_todos (id, user_id, text) VALUES (?,?,?)',
      [id, userId, text],
    );
    const [row] = await this.ds.query('SELECT * FROM app_todos WHERE id = ?', [id]);
    return this.mapRow(row);
  }

  async toggle(userId: string, id: string) {
    await this.ds.query(
      'UPDATE app_todos SET is_done = NOT is_done WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    const [row] = await this.ds.query('SELECT * FROM app_todos WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  async remove(userId: string, id: string) {
    await this.ds.query('DELETE FROM app_todos WHERE id = ? AND user_id = ?', [id, userId]);
    return { ok: true };
  }
}
