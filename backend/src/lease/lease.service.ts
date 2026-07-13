import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lease } from './lease.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LeaseService {
  constructor(
    @InjectRepository(Lease) private repo: Repository<Lease>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  findAll()               { return this.repo.find({ order: { created_at: 'DESC' } }); }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  async create(dto: Partial<Lease>) {
    const saved = await this.repo.save(this.repo.create(dto));
    const [renter] = await this.ds.query(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), name) AS name FROM tbl_renters WHERE id = ?`,
      [saved.renter_id],
    );
    await this.notifications.notify('lease', 'New lease created', `Lease for ${renter?.name ?? 'a renter'} was created`);
    return saved;
  }
  async update(id: number, dto: Partial<Lease>) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.save({ ...e, ...dto });
  }
  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.remove(e);
  }

  async findSummary(status: number, search?: string) {
    const conditions: string[] = ['l.status = ?'];
    const bindings: any[] = [status];

    if (search) {
      conditions.push('(r.first_name LIKE ? OR r.last_name LIKE ? OR p.property_name LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const rows = await this.ds.query(
      `SELECT
         l.id, l.renter_id, l.rent_amount, l.rent_deposit, l.start_date, l.end_date,
         l.lastbill_date, l.status,
         CONCAT(r.first_name, ' ', COALESCE(r.middle_name,''), ' ', COALESCE(r.last_name,'')) AS renter_name,
         p.property_name,
         f.name AS floor_name,
         (SELECT GROUP_CONCAT(pu.name SEPARATOR ', ')
            FROM tbl_lease_units lu
            JOIN tbl_property_units pu ON pu.id = lu.unit_id
            WHERE lu.lease_id = l.id) AS units,
         (SELECT COUNT(*) FROM tbl_pay_rents pr
            WHERE pr.lease_id = l.id AND pr.payment_month = DATE_FORMAT(NOW(), '%Y-%m')) AS paid_this_month
       FROM tbl_leases l
       LEFT JOIN tbl_renters r ON r.id = l.renter_id
       LEFT JOIN tbl_properties p ON p.id = l.property_id
       LEFT JOIN tbl_property_floors f ON f.id = l.floor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.lastbill_date ASC`,
      bindings,
    );

    return rows.map((r: any) => ({
      ...r,
      payment_status: Number(r.paid_this_month) > 0 ? 'Paid' : 'Pending',
    }));
  }
}
