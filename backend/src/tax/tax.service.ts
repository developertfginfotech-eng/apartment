import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TaxService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll() {
    return this.ds.query(`SELECT id, \`key\`, value FROM tbl_taxes ORDER BY id ASC`);
  }

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO tbl_taxes (\`key\`, value, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
      [body.key, body.value],
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
    await this.ds.query(`UPDATE tbl_taxes SET ${fields}, updated_at = NOW() WHERE id = ?`, [...values, id]);
    return { ok: true };
  }
}
