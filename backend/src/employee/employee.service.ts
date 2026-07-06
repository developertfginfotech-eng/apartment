import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EmployeeService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll(search?: string) {
    const conditions: string[] = ['e.status = 1'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('e.name LIKE ?');
      bindings.push(`%${search}%`);
    }

    return this.ds.query(
      `SELECT
         e.id, e.name, e.date_of_employment, e.employment_status,
         e.payment_type, e.mobile_number, e.bank_name, e.account_number,
         e.SWIFT_BIC_code, e.tincode, e.status,
         ss.name AS payment_type_name
       FROM employees e
       LEFT JOIN salary_structures ss ON ss.id = e.payment_type
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.id DESC`,
      bindings,
    );
  }

  async findOne(id: number) {
    const [row] = await this.ds.query(
      `SELECT
         e.id, e.name, e.date_of_employment, e.employment_status,
         e.payment_type, e.mobile_number, e.bank_name, e.account_number,
         e.SWIFT_BIC_code, e.tincode, e.status,
         ss.name AS payment_type_name
       FROM employees e
       LEFT JOIN salary_structures ss ON ss.id = e.payment_type
       WHERE e.id = ?`,
      [id],
    );
    return row ?? null;
  }

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO employees
        (name, date_of_employment, employment_status, payment_type,
         mobile_number, bank_name, account_number, SWIFT_BIC_code, tincode, status)
       VALUES (?,?,?,?,?,?,?,?,?,1)`,
      [
        body.name, body.date_of_employment, body.employment_status, body.payment_type,
        body.mobile_number, body.bank_name, body.account_number, body.SWIFT_BIC_code, body.tincode,
      ],
    );
    return { id: res.insertId };
  }

  async update(id: number, body: any) {
    await this.ds.query(
      `UPDATE employees SET
         name = ?, date_of_employment = ?, employment_status = ?, payment_type = ?,
         mobile_number = ?, bank_name = ?, account_number = ?, SWIFT_BIC_code = ?, tincode = ?
       WHERE id = ?`,
      [
        body.name, body.date_of_employment, body.employment_status, body.payment_type,
        body.mobile_number, body.bank_name, body.account_number, body.SWIFT_BIC_code, body.tincode,
        id,
      ],
    );
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`UPDATE employees SET status = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }
}
