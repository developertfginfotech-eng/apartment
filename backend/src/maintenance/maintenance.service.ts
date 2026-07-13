import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Maintenance } from './maintenance.entity';
import { NotificationService } from '../notification/notification.service';

const MAINTENANCE_STATUS_LABEL: Record<number, string> = {
  0: 'Under Process', 1: 'Open', 2: 'Completed', 3: 'Rejected',
};

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance) private repo: Repository<Maintenance>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
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
         m.maintenance_by, m.maintenances_status, m.reject_details,
         m.payment_status, m.payment_type, m.receipt_image
       FROM tbl_maintenances m
       LEFT JOIN tbl_properties p ON p.id = m.property_id
       LEFT JOIN tbl_maintenance_types mt ON mt.id = m.type
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.id DESC`,
      bindings,
    );
  }

  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  async create(dto: Partial<Maintenance>) {
    const saved = await this.repo.save(this.repo.create(dto));
    await this.notifications.notify('maintenance', 'New maintenance request', `${saved.title ?? 'A request'} was added`);
    return saved;
  }
  async update(id: number, dto: Partial<Maintenance>) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    const saved = await this.repo.save({ ...e, ...dto });
    if (dto.maintenances_status !== undefined && dto.maintenances_status !== e.maintenances_status) {
      const label = MAINTENANCE_STATUS_LABEL[dto.maintenances_status] ?? 'updated';
      await this.notifications.notify('maintenance', 'Maintenance request status changed', `${e.title ?? 'A request'} → ${label}`);
    }
    return saved;
  }
  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.remove(e);
  }
}
