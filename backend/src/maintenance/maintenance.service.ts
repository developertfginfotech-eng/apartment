import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Maintenance } from './maintenance.entity';
import { NotificationService } from '../notification/notification.service';

const MAINTENANCE_STATUS_LABEL: Record<number, string> = {
  0: 'Under Process', 1: 'Open', 2: 'Completed', 3: 'Rejected',
};

const NEW_COLUMNS: { name: string; ddl: string }[] = [
  { name: 'floor_id', ddl: 'ADD COLUMN floor_id int NULL AFTER property_id' },
  { name: 'unit_id', ddl: 'ADD COLUMN unit_id int NULL AFTER floor_id' },
  { name: 'famount', ddl: 'ADD COLUMN famount decimal(10,2) NULL AFTER title' },
  { name: 'tax', ddl: 'ADD COLUMN tax decimal(10,2) NULL AFTER famount' },
  { name: 'maintenances_paid_by', ddl: 'ADD COLUMN maintenances_paid_by int NULL AFTER maintenance_by' },
];

@Injectable()
export class MaintenanceService implements OnModuleInit {
  constructor(
    @InjectRepository(Maintenance) private repo: Repository<Maintenance>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async onModuleInit() {
    for (const col of NEW_COLUMNS) {
      const cols = await this.ds.query('SHOW COLUMNS FROM tbl_maintenances LIKE ?', [col.name]);
      if (!cols.length) {
        await this.ds.query(`ALTER TABLE tbl_maintenances ${col.ddl}`);
      }
    }
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_maintenance_documents\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NULL,
        \`maintenance_id\` int NOT NULL,
        \`document_type\` int NULL,
        \`document\` varchar(255) NULL,
        \`status\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  async findAll(search?: string, status?: string) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('(m.title LIKE ? OR p.property_name LIKE ? OR mt.name LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status === 'new') {
      conditions.push('DATE(m.date) = CURDATE()');
    } else if (status === 'open') {
      conditions.push('m.maintenances_status = 1');
    } else if (status === 'completed') {
      conditions.push('m.maintenances_status = 2');
    }

    return this.ds.query(
      `SELECT
         m.id, m.title, m.famount, m.tax, m.amount, m.date, m.description, m.status,
         m.property_id, p.property_name,
         m.floor_id, f.name AS floor_name,
         m.unit_id, u.name AS unit_name,
         m.type AS type_id, mt.name AS type_name,
         m.maintenance_by, m.maintenances_paid_by, m.maintenances_status, m.reject_details,
         m.payment_status, m.payment_type, m.receipt_image
       FROM tbl_maintenances m
       LEFT JOIN tbl_properties p ON p.id = m.property_id
       LEFT JOIN tbl_property_floors f ON f.id = m.floor_id
       LEFT JOIN tbl_property_units u ON u.id = m.unit_id
       LEFT JOIN tbl_maintenance_types mt ON mt.id = m.type
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.id DESC`,
      bindings,
    );
  }

  async findOne(id: number) {
    const [row] = await this.ds.query(
      `SELECT
         m.id, m.title, m.famount, m.tax, m.amount, m.date, m.description, m.status,
         m.property_id, p.property_name, p.property_code, p.address AS property_address,
         m.floor_id, f.name AS floor_name,
         m.unit_id, u.name AS unit_name,
         m.type, mt.name AS type_name,
         m.maintenance_by, m.maintenances_paid_by, m.maintenances_status, m.reject_details,
         m.payment_status, m.payment_type, m.receipt_image,
         m.cheque_details, m.cheque_image, m.online_details, m.online_image,
         m.pdc_cheque_details, m.pdc_cheque_image, m.pdc_cheque_date
       FROM tbl_maintenances m
       LEFT JOIN tbl_properties p ON p.id = m.property_id
       LEFT JOIN tbl_property_floors f ON f.id = m.floor_id
       LEFT JOIN tbl_property_units u ON u.id = m.unit_id
       LEFT JOIN tbl_maintenance_types mt ON mt.id = m.type
       WHERE m.id = ?`,
      [id],
    );
    return row ?? null;
  }

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
