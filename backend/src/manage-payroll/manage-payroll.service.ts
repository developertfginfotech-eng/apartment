import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// payroll date columns are varchar in mixed formats (MM-DD-YYYY legacy, YYYY-MM-DD new)
const dateExpr = (col: string) =>
  `COALESCE(STR_TO_DATE(${col}, '%m-%d-%Y'), STR_TO_DATE(${col}, '%Y-%m-%d'))`;

@Injectable()
export class ManagePayrollService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll(search?: string) {
    const conditions: string[] = ['status = 0'];
    const bindings: any[] = [];

    if (search) {
      conditions.push('name LIKE ?');
      bindings.push(`%${search}%`);
    }

    return this.ds.query(
      `SELECT id, name, start_date, end_date, status
       FROM manage_payrolls
       WHERE ${conditions.join(' AND ')}
       ORDER BY id DESC`,
      bindings,
    );
  }

  async create(body: { name: string; start_date: string; end_date: string }, userId: number | null) {
    const res = await this.ds.query(
      `INSERT INTO manage_payrolls (user_id, name, start_date, end_date, status) VALUES (?,?,?,?,0)`,
      [userId, body.name, body.start_date, body.end_date],
    );
    return { id: res.insertId };
  }

  async remove(id: number) {
    await this.ds.query(`DELETE FROM manage_payrolls WHERE id = ?`, [id]);
    return { ok: true };
  }

  async show(id: number, params: { from?: string; to?: string; search?: string }) {
    const [batch] = await this.ds.query(
      `SELECT id, name, start_date, end_date FROM manage_payrolls WHERE id = ?`,
      [id],
    );
    if (!batch) return { batch: null, data: [] };

    // status = 0 is "active" in this app's data (all 764 existing rows use it;
    // Laravel's reference query filtered status = 1, which never matches real data)
    const conditions: string[] = [
      'p.status = 0',
      `${dateExpr('p.start_date')} >= ${dateExpr('?')}`,
      `${dateExpr('p.end_date')} <= ${dateExpr('?')}`,
    ];
    const bindings: any[] = [batch.start_date, batch.end_date];

    if (params.from) {
      conditions.push(`${dateExpr('p.start_date')} >= ${dateExpr('?')}`);
      bindings.push(params.from);
    }
    if (params.to) {
      conditions.push(`${dateExpr('p.end_date')} <= ${dateExpr('?')}`);
      bindings.push(params.to);
    }
    if (params.search) {
      conditions.push('(p.basic LIKE ? OR p.net_pay LIKE ? OR p.cash_advance LIKE ? OR e.name LIKE ? OR ss.name LIKE ?)');
      bindings.push(...Array(5).fill(`%${params.search}%`));
    }

    const rows = await this.ds.query(
      `SELECT
         p.id, p.start_date, p.end_date, p.payment_date,
         p.basic, p.ot_pay, p.allowance, p.absences, p.late, p.rental,
         p.gross_pay, p.sss, p.phic, p.hdmf, p.gross_pay_net,
         p.sss_loan, p.hdmf_loan, p.cash_advance, p.adjustment,
         p.net_pay, p.checked_by, p.approved_by, p.prepared_by, p.status,
         e.name AS employee_name,
         CONCAT(pb.first_name, ' ', COALESCE(pb.last_name,'')) AS prepared_by_name,
         CONCAT(cb.first_name, ' ', COALESCE(cb.last_name,'')) AS checked_by_name,
         CONCAT(ab.first_name, ' ', COALESCE(ab.last_name,'')) AS approved_by_name
       FROM payrolls p
       LEFT JOIN employees e ON e.id = p.employee_id
       LEFT JOIN salary_structures ss ON ss.id = e.payment_type
       LEFT JOIN users pb ON pb.id = p.prepared_by
       LEFT JOIN users cb ON cb.id = p.checked_by
       LEFT JOIN users ab ON ab.id = p.approved_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.id DESC`,
      bindings,
    );

    return { batch, data: rows };
  }
}
