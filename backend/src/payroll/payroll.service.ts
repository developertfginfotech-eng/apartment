import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PayrollService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll(params: {
    page: number;
    limit: number;
    month?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    const { page = 1, limit = 50, month, from, to, search } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['p.status = 0'];
    const bindings: any[] = [];

    if (month) {
      conditions.push('MONTH(p.start_date) = ?');
      bindings.push(parseInt(month, 10));
    }
    if (from) {
      conditions.push('p.start_date >= ?');
      bindings.push(from);
    }
    if (to) {
      conditions.push('p.end_date <= ?');
      bindings.push(to);
    }
    if (search) {
      conditions.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.name LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult] = await this.ds.query(
      `SELECT COUNT(*) as total FROM payrolls p
       LEFT JOIN employees e ON e.id = p.employee_id
       ${where}`,
      bindings,
    );

    const rows = await this.ds.query(
      `SELECT
         p.id, p.start_date, p.end_date, p.payment_date,
         p.basic, p.ot_pay, p.allowance, p.absences, p.late, p.rental,
         p.gross_pay, p.sss, p.phic, p.hdmf, p.gross_pay_net,
         p.sss_loan, p.hdmf_loan, p.cash_advance, p.adjustment,
         p.net_pay, p.checked_by, p.approved_by, p.prepared_by, p.status,
         COALESCE(e.name, CONCAT_WS(' ', e.first_name, e.last_name)) AS employee_name,
         cb.first_name AS checked_by_name,
         ab.first_name AS approved_by_name
       FROM payrolls p
       LEFT JOIN employees e  ON e.id = p.employee_id
       LEFT JOIN users    cb  ON cb.id = p.checked_by
       LEFT JOIN users    ab  ON ab.id = p.approved_by
       ${where}
       ORDER BY p.id DESC
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

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO payrolls
        (employee_id, start_date, end_date, payment_date, basic, ot_pay, allowance, absences,
         late, rental, gross_pay, sss, phic, hdmf, gross_pay_net,
         sss_loan, hdmf_loan, cash_advance, adjustment, net_pay,
         checked_by, approved_by, prepared_by, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      [
        body.employee_id ?? null,
        body.start_date, body.end_date, body.payment_date ?? null,
        body.basic ?? 0, body.ot_pay ?? 0, body.allowance ?? 0,
        body.absences ?? 0, body.late ?? 0, body.rental ?? 0,
        body.gross_pay ?? 0,
        body.sss ?? 0, body.phic ?? 0, body.hdmf ?? 0,
        body.gross_pay_net ?? 0,
        body.sss_loan ?? 0, body.hdmf_loan ?? 0, body.cash_advance ?? 0,
        body.adjustment ?? 0, body.net_pay ?? 0,
        body.checked_by ?? null, body.approved_by ?? null, body.prepared_by ?? null,
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
    await this.ds.query(`UPDATE payrolls SET ${fields} WHERE id = ?`, [...values, id]);
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`UPDATE payrolls SET status = 1 WHERE id = ?`, [id]);
    return { ok: true };
  }

  async getEmployees() {
    return this.ds.query(
      `SELECT id, COALESCE(name, CONCAT_WS(' ', first_name, last_name)) AS name FROM employees WHERE status = 1 ORDER BY name ASC`
    ).catch(() => []);
  }
}
