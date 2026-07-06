import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Maintenance } from './maintenance.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance) private repo: Repository<Maintenance>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async findAll(search?: string) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('(m.title LIKE ? OR p.property_name LIKE ? OR mt.name LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    return this.ds.query(
      `SELECT
         m.id, m.title, m.amount, m.date, m.description, m.status,
         m.property_id, p.property_name,
         m.type AS type_id, mt.name AS type_name,
         m.maintenance_by, m.maintenances_status, m.payment_status
       FROM tbl_maintenances m
       LEFT JOIN tbl_properties p ON p.id = m.property_id
       LEFT JOIN tbl_maintenance_types mt ON mt.id = m.type
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.id DESC`,
      bindings,
    );
  }

  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Maintenance>) { return this.repo.save(this.repo.create(dto)); }
  async update(id: number, dto: Partial<Maintenance>) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.save({ ...e, ...dto });
  }
  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.remove(e);
  }
}
