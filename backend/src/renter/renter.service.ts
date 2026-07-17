import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Renter } from './renter.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class RenterService {
  constructor(
    @InjectRepository(Renter) private repo: Repository<Renter>,
    private dataSource: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async findAll() {
    try {
      const rows = await this.dataSource.query(`
        SELECT r.*,
          CONCAT_WS(' ', r.first_name, r.last_name) AS full_name,
          p.property_name,
          f.name AS floor_name,
          (SELECT GROUP_CONCAT(pu.name SEPARATOR ', ')
             FROM tbl_lease_units lu
             JOIN tbl_property_units pu ON pu.id = lu.unit_id
             WHERE lu.lease_id = l.id) AS on_rent,
          l.start_date AS lease_start_date,
          l.end_date AS lease_end_date
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
    } catch (err) {
      console.error('[RenterService] findAll error:', err instanceof Error ? err.message : err);
      // Fallback: return basic list without JOIN
      const rows = await this.dataSource.query('SELECT * FROM tbl_renters ORDER BY first_name ASC');
      return rows.map((r: any) => ({
        ...r,
        name: r.full_name || (r.first_name ? `${r.first_name} ${r.last_name ?? ''}`.trim() : r.name) || '',
      }));
    }
  }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  async create(dto: Partial<Renter>) {
    const saved = await this.repo.save(this.repo.create(dto));
    const name = `${saved.first_name ?? ''} ${saved.last_name ?? ''}`.trim() || 'A renter';
    await this.notifications.notify('renter', 'New renter added', `${name} was added`);
    return saved;
  }
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
