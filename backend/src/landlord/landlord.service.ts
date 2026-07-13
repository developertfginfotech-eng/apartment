import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Landlord } from './landlord.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LandlordService {
  constructor(
    @InjectRepository(Landlord) private repo: Repository<Landlord>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  findAll() {
    return this.ds.query(`
      SELECT
        l.id, l.user_id, l.first_name, l.middle_name, l.last_name, l.phone, l.email,
        l.registration_date, l.owner_type, l.company_type, l.country, l.id_number,
        l.state, l.city, l.postal_address, l.physical_address, l.residential_address,
        l.status, l.created_at, l.updated_at,
        COUNT(DISTINCT p.id) AS total_property,
        COUNT(DISTINCT r.id) AS total_renter
      FROM tbl_landlords l
      LEFT JOIN tbl_properties p ON p.landlord_id = l.id AND p.status = 1
      LEFT JOIN tbl_renters r ON r.property_id = p.id AND r.status = 1
      GROUP BY l.id
      ORDER BY l.id DESC
    `);
  }

  async findOne(id: number) {
    const landlord = await this.repo.findOne({ where: { id } });
    if (!landlord) return null;

    const properties = await this.ds.query(
      `SELECT p.id, p.property_name, p.property_code, p.address,
              COUNT(DISTINCT pf.id) AS total_floor,
              COUNT(DISTINCT pu.id) AS total_unit
       FROM tbl_properties p
       LEFT JOIN tbl_property_floors pf ON pf.property_id = p.id AND pf.status = 1
       LEFT JOIN tbl_property_units pu ON pu.property_id = p.id AND pu.status = 1
       WHERE p.landlord_id = ? AND p.status = 1
       GROUP BY p.id
       ORDER BY p.property_name ASC`,
      [id],
    );

    return { ...landlord, properties };
  }

  async create(dto: Partial<Landlord> & { password?: string }) {
    const password = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const saved = await this.repo.save(this.repo.create({ ...dto, password: password ?? undefined, status: 1 }));
    const name = `${saved.first_name ?? ''} ${saved.last_name ?? ''}`.trim() || 'A new owner';
    await this.notifications.notify('owner', 'New owner added', `${name} was added`);
    return saved;
  }

  async update(id: number, dto: Partial<Landlord> & { password?: string }) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    const { password, ...rest } = dto;
    const merged: Partial<Landlord> = { ...r, ...rest };
    if (password) merged.password = await bcrypt.hash(password, 10);
    return this.repo.save(merged);
  }

  async remove(id: number) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.repo.remove(r);
  }

  getCountries() {
    return this.ds.query(`SELECT id, name FROM country ORDER BY name ASC`);
  }
}
