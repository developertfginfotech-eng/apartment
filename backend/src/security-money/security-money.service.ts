import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SecurityMoneyService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll(params: { page: number; limit: number; search?: string }) {
    const { page = 1, limit = 50, search } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['l.status = 1'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('(r.first_name LIKE ? OR r.last_name LIKE ? OR p.property_name LIKE ? OR l.rent_amount LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countResult] = await this.ds.query(
      `SELECT COUNT(*) as total FROM tbl_leases l
       LEFT JOIN tbl_renters r ON r.id = l.renter_id
       LEFT JOIN tbl_properties p ON p.id = l.property_id
       ${where}`,
      bindings,
    );

    const rows = await this.ds.query(
      `SELECT
         l.id, l.rent_amount, l.rent_deposit,
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
       ${where}
       ORDER BY l.lastbill_date ASC
       LIMIT ? OFFSET ?`,
      [...bindings, limit, offset],
    );

    return {
      data: rows,
      total: parseInt(countResult.total, 10),
      page,
      limit,
      pages: Math.ceil(parseInt(countResult.total, 10) / limit),
    };
  }

  async getHistory(leaseId: number) {
    return this.ds.query(
      `SELECT id, lease_id, amount, title, reason, type, payment_date, payment_type, status
       FROM refund_security_money
       WHERE lease_id = ?
       ORDER BY payment_date DESC, id DESC`,
      [leaseId],
    );
  }

  async addTransaction(leaseId: number, body: any, userId: number | null) {
    await this.ds.query(
      `INSERT INTO refund_security_money
        (user_id, lease_id, amount, title, reason, type, status, payment_date, payment_type)
       VALUES (?,?,?,?,?,?,1,?,?)`,
      [
        userId,
        leaseId,
        body.amount,
        body.title,
        body.reason ?? null,
        body.type,
        body.payment_date,
        body.payment_type ?? '',
      ],
    );

    const op = body.type === 'add' ? '+' : '-';
    await this.ds.query(
      `UPDATE tbl_leases SET rent_deposit = COALESCE(rent_deposit, 0) ${op} ? WHERE id = ?`,
      [body.amount, leaseId],
    );

    return { ok: true };
  }
}
