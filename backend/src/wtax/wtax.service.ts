import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class WtaxService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll() {
    return this.ds.query(`SELECT id, \`key\`, value, status FROM wtaxes ORDER BY id DESC`);
  }

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO wtaxes (\`key\`, value, status) VALUES (?, ?, ?)`,
      [body.key, body.value, body.status ?? 1],
    );
    return { id: res.insertId };
  }

  async update(id: number, body: any) {
    const fields = Object.keys(body)
      .filter(k => !['id'].includes(k))
      .map(k => `\`${k}\` = ?`)
      .join(', ');
    const values = Object.keys(body)
      .filter(k => !['id'].includes(k))
      .map(k => body[k]);
    if (!fields) return { ok: true };
    await this.ds.query(`UPDATE wtaxes SET ${fields} WHERE id = ?`, [...values, id]);
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`DELETE FROM wtaxes WHERE id = ?`, [id]);
    return { ok: true };
  }
}
