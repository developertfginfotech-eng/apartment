import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class UtilityService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll() {
    return this.ds.query(
      `SELECT
         u.id, u.month, u.water_bill, u.water_bill_due_from, u.water_bill_due_to,
         u.electric_bill, u.electric_bill_due_from, u.electric_bill_due_to,
         u.gas_bill, u.security_bill, u.cusa, u.other_bill, u.total_rent, u.interest,
         u.issue_date, u.payment_type, u.payment_mode, u.payment_status,
         CONCAT(r.first_name, ' ', COALESCE(r.last_name,'')) AS renter_name,
         p.property_name,
         f.name AS floor_name,
         pu.name AS unit_name
       FROM tbl_utilities u
       LEFT JOIN tbl_renters r ON r.id = u.renter_id
       LEFT JOIN tbl_properties p ON p.id = u.property_id
       LEFT JOIN tbl_property_floors f ON f.id = u.floor_id
       LEFT JOIN tbl_property_units pu ON pu.id = u.unit_id
       ORDER BY u.id DESC`,
    );
  }

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO tbl_utilities
        (renter_id, property_id, floor_id, unit_id, month,
         water_bill, water_bill_due_from, water_bill_due_to,
         electric_bill, electric_bill_due_from, electric_bill_due_to,
         gas_bill, security_bill, cusa, other_bill, total_rent, interest,
         issue_date, payment_type, payment_mode, payment_status, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        body.renter_id ?? null, body.property_id ?? null, body.floor_id ?? null, body.unit_id ?? null,
        body.month ?? null,
        body.water_bill ?? 0, body.water_bill_due_from ?? null, body.water_bill_due_to ?? null,
        body.electric_bill ?? 0, body.electric_bill_due_from ?? null, body.electric_bill_due_to ?? null,
        body.gas_bill ?? 0, body.security_bill ?? 0, body.cusa ?? 0, body.other_bill ?? 0,
        body.total_rent ?? 0, body.interest ?? null,
        body.issue_date ?? null, body.payment_type ?? '', body.payment_mode ?? null,
        body.payment_status ?? 0,
      ],
    );
    return { id: res.insertId };
  }

  async update(id: number, body: any) {
    const fields = Object.keys(body)
      .filter(k => !['id'].includes(k))
      .map(k => `\`${k}\` = ?`)
      .join(', ');
    const values = Object.keys(body)
      .filter(k => !['id'].includes(k))
      .map(k => body[k]);
    if (!fields) return { ok: true };
    await this.ds.query(`UPDATE tbl_utilities SET ${fields} WHERE id = ?`, [...values, id]);
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`DELETE FROM tbl_utilities WHERE id = ?`, [id]);
    return { ok: true };
  }
}
