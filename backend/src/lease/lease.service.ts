import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lease } from './lease.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LeaseService implements OnModuleInit {
  constructor(
    @InjectRepository(Lease) private repo: Repository<Lease>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit() {
    this.checkExpiringLeases();
  }

  findAll()               { return this.repo.find({ order: { created_at: 'DESC' } }); }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }

  async findFull(id: number) {
    const [lease] = await this.ds.query(
      `SELECT l.*,
         CONCAT(r.first_name, ' ', COALESCE(r.middle_name,''), ' ', COALESCE(r.last_name,'')) AS renter_name,
         r.renter_type, r.email AS renter_email, r.contact AS renter_contact,
         r.national_id AS renter_national_id, r.address AS renter_address,
         p.property_name,
         f.name AS floor_name
       FROM tbl_leases l
       LEFT JOIN tbl_renters r ON r.id = l.renter_id
       LEFT JOIN tbl_properties p ON p.id = l.property_id
       LEFT JOIN tbl_property_floors f ON f.id = l.floor_id
       WHERE l.id = ?`,
      [id],
    );
    if (!lease) throw new NotFoundException();
    const units = await this.ds.query(`SELECT unit_id FROM tbl_lease_units WHERE lease_id = ? AND status = 1`, [id]);
    const deposits = await this.ds.query(`SELECT id, utility_type, utility FROM tbl_lease_utilities WHERE lease_id = ? AND status = 1`, [id]);
    return { ...lease, unit_ids: units.map((u: any) => u.unit_id), deposits };
  }

  private async replaceLeaseUnits(leaseId: number, propertyId: number, unitIds?: number[]) {
    if (!unitIds) return;
    await this.ds.query(`DELETE FROM tbl_lease_units WHERE lease_id = ?`, [leaseId]);
    for (const unitId of unitIds) {
      await this.ds.query(
        `INSERT INTO tbl_lease_units (property_id, lease_id, unit_id, status) VALUES (?, ?, ?, 1)`,
        [propertyId, leaseId, unitId],
      );
    }
  }

  private async replaceLeaseUtilities(leaseId: number, deposits?: { utility_type: number; utility: string }[]) {
    if (!deposits) return;
    await this.ds.query(`DELETE FROM tbl_lease_utilities WHERE lease_id = ?`, [leaseId]);
    for (const d of deposits) {
      if (!d.utility_type || !d.utility) continue;
      await this.ds.query(
        `INSERT INTO tbl_lease_utilities (lease_id, utility_type, utility, status) VALUES (?, ?, ?, 1)`,
        [leaseId, d.utility_type, d.utility],
      );
    }
  }

  async create(dto: any) {
    const { unit_ids, deposits, ...fields } = dto;
    fields.status = fields.status ?? 1;
    const saved = await this.repo.save(this.repo.create(fields as Partial<Lease>));
    await this.replaceLeaseUnits(saved.id, saved.property_id, unit_ids);
    await this.replaceLeaseUtilities(saved.id, deposits);
    const [renter] = await this.ds.query(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), name) AS name FROM tbl_renters WHERE id = ?`,
      [saved.renter_id],
    );
    await this.notifications.notify('lease', 'New lease created', `Lease for ${renter?.name ?? 'a renter'} was created`);
    return saved;
  }

  async update(id: number, dto: any) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    const { unit_ids, deposits, ...fields } = dto;
    const saved = await this.repo.save({ ...e, ...fields });
    await this.replaceLeaseUnits(id, saved.property_id, unit_ids);
    await this.replaceLeaseUtilities(id, deposits);

    const renterId = fields.renter_id ?? e.renter_id;
    if (renterId) {
      const firstUnit = Array.isArray(unit_ids) && unit_ids.length ? unit_ids[0] : null;
      await this.ds.query(
        `UPDATE tbl_renters SET property_id = ?, floor_id = ?, unit_id = COALESCE(?, unit_id), advance_rent = ?, rent_per_month = ? WHERE id = ?`,
        [saved.property_id, saved.floor_id, firstUnit, saved.rent_deposit, saved.rent_amount, renterId],
      );
    }
    return saved;
  }

  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.remove(e);
  }

  private monthBefore(dateStr: string): string {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async escalate(id: number, dto: any) {
    const lease = await this.repo.findOne({ where: { id } });
    if (!lease) throw new NotFoundException();
    if (!dto.amount || !dto.end_date) {
      throw new BadRequestException('Rent Amount and When to start date are required');
    }

    const requiredMonth = this.monthBefore(dto.end_date);
    const [paid] = await this.ds.query(
      `SELECT 1 FROM tbl_pay_rents WHERE lease_id = ? AND payment_month = ? LIMIT 1`,
      [id, requiredMonth],
    );
    if (!paid) {
      throw new BadRequestException('Check your payment history! Please pay all previous dues first.');
    }

    await this.ds.query(
      `INSERT INTO lease_agreement_histories
        (lease_id, lease_no, amount, type, tax, wtax_applicable, wtax, maintenance, rent_amount, document_image, start_date, end_date, total_rent, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, lease.lease_no, lease.amount, 'Escalation', lease.tax, lease.wtax_applicable, lease.wtax,
        lease.maintenance, lease.rent_amount, lease.document_image, lease.start_date, dto.end_date, lease.total_rent, 1,
      ],
    );

    const updated = await this.repo.save({
      ...lease,
      amount: dto.amount,
      rent_amount: dto.rent_amount,
      tax: dto.tax,
      wtax_applicable: dto.wtax_applicable,
      wtax: dto.wtax,
      maintenance: dto.maintenance,
    });

    const [renter] = await this.ds.query(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), name) AS name FROM tbl_renters WHERE id = ?`,
      [lease.renter_id],
    );
    await this.notifications.notify('lease', 'Lease rent escalated', `Rent for ${renter?.name ?? 'a renter'} was escalated`);
    return updated;
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

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringLeases() {
    try {
      const rows = await this.ds.query(
        `SELECT l.id, l.end_date,
           COALESCE(NULLIF(TRIM(CONCAT_WS(' ', r.first_name, r.last_name)), ''), r.name) AS renter_name
         FROM tbl_leases l
         LEFT JOIN tbl_renters r ON r.id = l.renter_id
         WHERE l.status = 1 AND l.end_date IS NOT NULL
           AND DATEDIFF(l.end_date, CURDATE()) BETWEEN 0 AND 60`,
      );

      for (const row of rows) {
        const marker = `Lease #${row.id} expiring soon`;
        const [existing] = await this.ds.query(
          `SELECT id FROM app_notifications WHERE type = 'lease_expiring' AND title = ? LIMIT 1`,
          [marker],
        );
        if (existing) continue;
        await this.notifications.notify(
          'lease_expiring',
          marker,
          `Lease for ${row.renter_name ?? 'a renter'} ends on ${row.end_date}`,
        );
      }
    } catch (err) {
      console.error('[LeaseService] checkExpiringLeases failed:', err instanceof Error ? err.message : err);
    }
  }
}
