import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './payment.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private repo: Repository<Payment>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  findAll()               { return this.repo.find({ order: { created_at: 'DESC' } }); }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Payment>) { return this.repo.save(this.repo.create(dto)); }
  async update(id: number, dto: Partial<Payment>) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.save({ ...e, ...dto });
  }
  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.remove(e);
  }

  // ── Rent / Interest tab: lease-level summary with month-by-month overdue ──
  async findRentSummary(from?: string, to?: string, search?: string) {
    const conditions: string[] = ['l.status = 1'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('(r.first_name LIKE ? OR r.last_name LIKE ? OR p.property_name LIKE ? OR l.rent_amount LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (from) { conditions.push('l.start_date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('l.start_date <= ?'); bindings.push(to); }

    const leases = await this.ds.query(
      `SELECT
         l.id, l.rent_amount, l.start_date, l.end_date, l.lastbill_date,
         CONCAT(r.first_name, ' ', COALESCE(r.middle_name,''), ' ', COALESCE(r.last_name,'')) AS renter_name,
         p.property_name,
         f.name AS floor_name,
         (SELECT GROUP_CONCAT(pu.name SEPARATOR ', ')
            FROM tbl_lease_units lu
            JOIN tbl_property_units pu ON pu.id = lu.unit_id
            WHERE lu.lease_id = l.id) AS units
       FROM tbl_leases l
       LEFT JOIN tbl_renters r ON r.id = l.renter_id
       LEFT JOIN tbl_properties p ON p.id = l.property_id
       LEFT JOIN tbl_property_floors f ON f.id = l.floor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.lastbill_date ASC`,
      bindings,
    );

    if (!leases.length) return [];

    const leaseIds = leases.map((l: any) => l.id);
    const pays = await this.ds.query(
      `SELECT lease_id, payment_month, payment_type
       FROM tbl_pay_rents
       WHERE lease_id IN (${leaseIds.map(() => '?').join(',')})`,
      leaseIds,
    );
    const paysByLease = new Map<number, { payment_month: string; payment_type: string }[]>();
    for (const p of pays) {
      const arr = paysByLease.get(p.lease_id) ?? [];
      arr.push(p);
      paysByLease.set(p.lease_id, arr);
    }

    const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');
    const currentYm = new Date().toISOString().slice(0, 7);

    return leases.map((l: any) => {
      const lp = paysByLease.get(l.id) ?? [];
      const paidMonths = new Set(lp.map(p => p.payment_month));
      const overdueMonths: string[] = [];
      let paymentStatus: 'Paid' | 'Pending' = 'Pending';
      let paymentMethod: string | null = null;

      if (l.start_date && l.end_date) {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cursor <= endCursor) {
          const ym = cursor.toISOString().slice(0, 7);
          if (!paidMonths.has(ym)) overdueMonths.push(monthLabel(cursor));
          if (ym === currentYm) {
            const rec = lp.find(p => p.payment_month === ym);
            if (rec) { paymentStatus = 'Paid'; paymentMethod = rec.payment_type; }
          }
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      return { ...l, overdueMonths, payment_status: paymentStatus, payment_method: paymentMethod };
    });
  }

  // ── Rent tab row action: per-lease payment/transaction history ──
  async findLeaseHistory(leaseId: number) {
    return this.ds.query(
      `SELECT pr.id, pr.renter_id, pr.month, pr.payment_month, pr.year, pr.amount,
              pr.deposit_amount, pr.total_amount, pr.payment_type, pr.payment_date,
              pr.receipt_image, pr.remark,
              pr.cheque_details, pr.cheque_image, pr.online_details, pr.online_image,
              pr.pdc_cheque_details, pr.pdc_cheque_image, pr.pdc_cheque_date,
              CONCAT(r.first_name, ' ', COALESCE(r.last_name,'')) AS renter_name
       FROM tbl_pay_rents pr
       LEFT JOIN tbl_renters r ON r.id = pr.renter_id
       WHERE pr.lease_id = ?
       ORDER BY pr.payment_date DESC, pr.id DESC`,
      [leaseId],
    );
  }

  async updateLeaseHistory(id: number, body: any) {
    const allowed = [
      'amount', 'payment_month', 'payment_date', 'payment_type', 'deposit_amount', 'total_amount',
      'receipt_image', 'remark', 'cheque_details', 'cheque_image', 'online_details', 'online_image',
      'pdc_cheque_details', 'pdc_cheque_image', 'pdc_cheque_date',
    ];
    const keys = Object.keys(body).filter(k => allowed.includes(k));
    if (!keys.length) return { ok: true };
    const fields = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => body[k]);
    await this.ds.query(`UPDATE tbl_pay_rents SET ${fields} WHERE id = ?`, [...values, id]);
    return { ok: true };
  }

  async createLeaseHistory(leaseId: number, body: any) {
    const [lease] = await this.ds.query(`SELECT renter_id, property_id FROM tbl_leases WHERE id = ?`, [leaseId]);
    if (!lease) throw new NotFoundException('Lease not found');
    await this.ds.query(
      `INSERT INTO tbl_pay_rents (lease_id, renter_id, property_id, payment_month, amount, deposit_amount, payment_type, payment_date, status)
       VALUES (?,?,?,?,?,?,?,?,1)`,
      [
        leaseId, lease.renter_id, lease.property_id,
        body.payment_month ?? null, body.amount ?? 0, body.deposit_amount ?? 0,
        body.payment_type ?? 'Cash', body.payment_date ?? null,
      ],
    );
    const [renter] = await this.ds.query(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), name) AS name FROM tbl_renters WHERE id = ?`,
      [lease.renter_id],
    );
    await this.notifications.notify('payment', 'Rent payment received', `₱${Number(body.amount ?? 0).toLocaleString()} from ${renter?.name ?? 'a renter'}`);
    return { ok: true };
  }

  // ── Maintenances tab ──
  async findMaintenance() {
    return this.ds.query(
      `SELECT m.id, m.title, m.amount, m.date, m.description, m.payment_type, m.payment_status,
              m.receipt_image, m.cheque_details, m.cheque_image, m.online_details, m.online_image,
              m.pdc_cheque_details, m.pdc_cheque_image, m.pdc_cheque_date,
              p.property_name
       FROM tbl_maintenances m
       LEFT JOIN tbl_properties p ON p.id = m.property_id
       ORDER BY m.date DESC`,
    );
  }
  async payMaintenance(id: number, body: any) {
    const payment_status = body.payment_type === 'Pdc Cheque' ? 0 : 1;
    await this.ds.query(
      `UPDATE tbl_maintenances SET
         payment_type = ?, payment_status = ?, receipt_image = ?,
         cheque_details = ?, cheque_image = ?,
         online_details = ?, online_image = ?,
         pdc_cheque_details = ?, pdc_cheque_image = ?, pdc_cheque_date = ?
       WHERE id = ?`,
      [
        body.payment_type ?? null, payment_status, body.receipt_image ?? null,
        body.cheque_details ?? null, body.cheque_image ?? null,
        body.online_details ?? null, body.online_image ?? null,
        body.pdc_cheque_details ?? null, body.pdc_cheque_image ?? null, body.pdc_cheque_date ?? null,
        id,
      ],
    );
    if (payment_status === 1) {
      const [m] = await this.ds.query(`SELECT title, amount FROM tbl_maintenances WHERE id = ?`, [id]);
      await this.notifications.notify('payment', 'Maintenance payment received', `₱${Number(m?.amount ?? 0).toLocaleString()} for ${m?.title ?? 'a maintenance request'}`);
    }
    return { ok: true };
  }

  // ── Utilities Bill tab ──
  async findUtility() {
    return this.ds.query(
      `SELECT u.id, u.total_rent, u.issue_date, u.payment_type, u.payment_status,
              u.receipt_image, u.cheque_details, u.cheque_image, u.online_details, u.online_image,
              u.pdc_cheque_details, u.pdc_cheque_image, u.pdc_cheque_date,
              p.property_name
       FROM tbl_utilities u
       LEFT JOIN tbl_properties p ON p.id = u.property_id
       ORDER BY u.issue_date DESC`,
    );
  }
  async payUtility(id: number, body: any) {
    const payment_status = body.payment_type === 'Pdc Cheque' ? 0 : 1;
    await this.ds.query(
      `UPDATE tbl_utilities SET
         payment_type = ?, payment_status = ?, receipt_image = ?,
         cheque_details = ?, cheque_image = ?,
         online_details = ?, online_image = ?,
         pdc_cheque_details = ?, pdc_cheque_image = ?, pdc_cheque_date = ?
       WHERE id = ?`,
      [
        body.payment_type ?? null, payment_status, body.receipt_image ?? null,
        body.cheque_details ?? null, body.cheque_image ?? null,
        body.online_details ?? null, body.online_image ?? null,
        body.pdc_cheque_details ?? null, body.pdc_cheque_image ?? null, body.pdc_cheque_date ?? null,
        id,
      ],
    );
    if (payment_status === 1) {
      const [u] = await this.ds.query(`SELECT total_rent FROM tbl_utilities WHERE id = ?`, [id]);
      await this.notifications.notify('payment', 'Utility payment received', `₱${Number(u?.total_rent ?? 0).toLocaleString()} utility bill paid`);
    }
    return { ok: true };
  }

  // ── Parking Bill tab ──
  async findParking() {
    return this.ds.query(
      `SELECT pk.id, pk.price, pk.payment_date, pk.payment_type, pk.payment_status,
              CONCAT(r.first_name, ' ', COALESCE(r.last_name,'')) AS renter_name,
              p.property_name
       FROM parkings pk
       LEFT JOIN tbl_renters r ON r.id = pk.renter_id
       LEFT JOIN tbl_properties p ON p.id = pk.property_id
       ORDER BY pk.payment_date DESC`,
    );
  }
  async payParking(id: number) {
    await this.ds.query(`UPDATE parkings SET payment_status = '1' WHERE id = ?`, [id]);
    return { ok: true };
  }
  async removeParking(id: number) {
    await this.ds.query(`DELETE FROM parkings WHERE id = ?`, [id]);
    return { ok: true };
  }
}
