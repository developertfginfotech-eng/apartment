import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SalaryStructureService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll(search?: string) {
    const conditions: string[] = ['status = 1'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('name LIKE ?');
      bindings.push(`%${search}%`);
    }

    return this.ds.query(
      `SELECT id, name, status FROM salary_structures WHERE ${conditions.join(' AND ')} ORDER BY id DESC`,
      bindings,
    );
  }

  async create(name: string, userId: number | null) {
    const res = await this.ds.query(
      `INSERT INTO salary_structures (user_id, name, status) VALUES (?, ?, 1)`,
      [userId, name],
    );
    return { id: res.insertId };
  }

  async update(id: number, name: string) {
    await this.ds.query(`UPDATE salary_structures SET name = ? WHERE id = ?`, [name, id]);
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`UPDATE salary_structures SET status = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }
}
