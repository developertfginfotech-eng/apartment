import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Property } from './property.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property) private repo: Repository<Property>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  findAll() {
    return this.ds.query(`
      SELECT
        p.id, p.landlord_id, p.property_type, p.property_name, p.property_code,
        p.ownership_percentage, p.address, p.status,
        CONCAT(l.first_name, ' ', COALESCE(l.last_name,'')) AS owner_name,
        COUNT(DISTINCT pf.id) AS total_floor,
        COUNT(DISTINCT pu.id) AS total_unit,
        COUNT(DISTINCT r.id)  AS total_renter
      FROM tbl_properties p
      LEFT JOIN tbl_landlords l ON l.id = p.landlord_id
      LEFT JOIN tbl_property_floors pf ON pf.property_id = p.id AND pf.status = 1
      LEFT JOIN tbl_property_units pu ON pu.property_id = p.id AND pu.status = 1
      LEFT JOIN tbl_renters r ON r.property_id = p.id AND r.status = 1
      WHERE p.status = 1
      GROUP BY p.id
      ORDER BY p.property_name ASC
    `);
  }

  async findOne(id: number) {
    const [property] = await this.ds.query(
      `SELECT
         p.id, p.landlord_id, p.property_type, p.property_name, p.property_code,
         p.ownership_percentage, p.address, p.status,
         CONCAT(l.first_name, ' ', COALESCE(l.last_name,'')) AS owner_name
       FROM tbl_properties p
       LEFT JOIN tbl_landlords l ON l.id = p.landlord_id
       WHERE p.id = ?`,
      [id],
    );
    if (!property) return null;

    const floors = await this.ds.query(
      `SELECT id, name, area FROM tbl_property_floors WHERE property_id = ? AND status = 1 ORDER BY id ASC`,
      [id],
    );
    const units = await this.ds.query(
      `SELECT id, floor_id, name, area FROM tbl_property_units WHERE property_id = ? AND status = 1 ORDER BY id ASC`,
      [id],
    );
    const documents = await this.ds.query(
      `SELECT pd.id, pd.document_type, pd.document, d.name AS document_type_name
       FROM tbl_property_documents pd
       LEFT JOIN tbl_documents d ON d.id = pd.document_type
       WHERE pd.property_id = ? AND pd.status = 1
       ORDER BY pd.id DESC`,
      [id],
    );
    const renters = await this.ds.query(
      `SELECT r.id, CONCAT(r.first_name, ' ', COALESCE(r.last_name,'')) AS name, r.contact, r.email,
              pf.name AS floor_name, pu.name AS unit_name
       FROM tbl_renters r
       LEFT JOIN tbl_property_floors pf ON pf.id = r.floor_id
       LEFT JOIN tbl_property_units pu ON pu.id = r.unit_id
       WHERE r.property_id = ? AND r.status = 1
       ORDER BY r.id DESC`,
      [id],
    );
    const [financial] = await this.ds.query(
      `SELECT
         COALESCE((SELECT SUM(amount) FROM tbl_pay_rents WHERE property_id = ?), 0) AS pay_amount,
         COALESCE((SELECT SUM(amount) FROM tbl_expenses WHERE property_id = ?), 0) AS expenses,
         COALESCE((SELECT SUM(amount) FROM tbl_maintenances WHERE property_id = ? AND maintenance_by = 0), 0) AS owner_maintenance,
         COALESCE((SELECT SUM(amount) FROM tbl_maintenances WHERE property_id = ? AND maintenance_by = 1), 0) AS renter_maintenance,
         COALESCE((SELECT SUM(rent_deposit) FROM tbl_leases WHERE property_id = ?), 0) AS deposit`,
      [id, id, id, id, id],
    );

    return {
      ...property,
      floors: floors.map((f: any) => ({ ...f, units: units.filter((u: any) => String(u.floor_id) === String(f.id)) })),
      documents,
      renters,
      financial,
    };
  }

  async create(dto: Partial<Property>) {
    const p = this.repo.create({ ...dto, status: 1 });
    const saved = await this.repo.save(p);
    await this.notifications.notify('property', 'New property added', `${saved.property_name ?? 'A property'} was added`);
    return saved;
  }

  async update(id: number, dto: Partial<Property>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return this.repo.save({ ...p, ...dto });
  }

  async remove(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return this.repo.remove(p);
  }
}
