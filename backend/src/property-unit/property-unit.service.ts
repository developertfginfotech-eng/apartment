import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PropertyUnitService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  findAll(params: { propertyId?: number; floorId?: number }) {
    const conditions = ['status = 1'];
    const bindings: any[] = [];
    if (params.propertyId) { conditions.push('property_id = ?'); bindings.push(params.propertyId); }
    if (params.floorId)    { conditions.push('floor_id = ?');    bindings.push(params.floorId); }
    return this.ds.query(
      `SELECT id, property_id, floor_id, name, area FROM tbl_property_units WHERE ${conditions.join(' AND ')} ORDER BY id ASC`,
      bindings,
    );
  }

  async create(body: { property_id: number; floor_id: number; name: string; area?: number }) {
    const res = await this.ds.query(
      `INSERT INTO tbl_property_units (property_id, floor_id, name, area, status) VALUES (?,?,?,?,1)`,
      [body.property_id, body.floor_id, body.name, body.area ?? 0],
    );
    return { id: res.insertId };
  }

  async update(id: number, body: { name?: string; area?: number }) {
    await this.ds.query(
      `UPDATE tbl_property_units SET name = COALESCE(?, name), area = COALESCE(?, area) WHERE id = ?`,
      [body.name ?? null, body.area ?? null, id],
    );
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`UPDATE tbl_property_units SET status = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }
}
