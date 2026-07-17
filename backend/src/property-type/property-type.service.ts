import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PropertyTypeService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  findAll() {
    return this.ds.query(
      `SELECT id, name FROM tbl_property_types WHERE status = 1 ORDER BY name ASC`,
    );
  }

  findAllAdmin() {
    return this.ds.query(
      `SELECT id, name, display_name, description, status FROM tbl_property_types ORDER BY name ASC`,
    );
  }

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO tbl_property_types (name, display_name, description, status) VALUES (?, ?, ?, ?)`,
      [body.name, body.display_name ?? null, body.description ?? null, body.status ?? 1],
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
    await this.ds.query(`UPDATE tbl_property_types SET ${fields} WHERE id = ?`, [...values, id]);
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`DELETE FROM tbl_property_types WHERE id = ?`, [id]);
    return { ok: true };
  }
}
