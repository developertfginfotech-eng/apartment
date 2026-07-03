import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Renter } from './renter.entity';

@Injectable()
export class RenterService {
  constructor(
    @InjectRepository(Renter) private repo: Repository<Renter>,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    const rows = await this.dataSource.query(`
      SELECT r.*,
        CONCAT_WS(' ', r.first_name, r.last_name) AS full_name,
        p.property_name,
        f.floor_name,
        l.on_rent
      FROM tbl_renters r
      LEFT JOIN tbl_properties p ON p.id = r.property_id
      LEFT JOIN tbl_property_floors f ON f.id = r.floor_id
      LEFT JOIN tbl_leases l ON l.renter_id = r.id AND l.status = 1
      ORDER BY r.first_name ASC
    `);
    return rows.map((r: any) => ({
      ...r,
      name: r.full_name || r.name || '',
    }));
  }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Renter>) { return this.repo.save(this.repo.create(dto)); }
  async update(id: number, dto: Partial<Renter>) {
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
