import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PropertyFloorService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  findAll(propertyId?: number) {
    const conditions = ['status = 1'];
    const bindings: any[] = [];
    if (propertyId) { conditions.push('property_id = ?'); bindings.push(propertyId); }
    return this.ds.query(
      `SELECT id, property_id, name, area FROM tbl_property_floors WHERE ${conditions.join(' AND ')} ORDER BY id ASC`,
      bindings,
    );
  }

  async create(body: { property_id: number; name: string; area?: number }) {
    const res = await this.ds.query(
      `INSERT INTO tbl_property_floors (property_id, name, area, status) VALUES (?,?,?,1)`,
      [body.property_id, body.name, body.area ?? 0],
    );
    return { id: res.insertId };
  }

  async update(id: number, body: { name?: string; area?: number }) {
    await this.ds.query(
      `UPDATE tbl_property_floors SET name = COALESCE(?, name), area = COALESCE(?, area) WHERE id = ?`,
      [body.name ?? null, body.area ?? null, id],
    );
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`UPDATE tbl_property_floors SET status = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }
}
