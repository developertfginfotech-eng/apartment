import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LoanService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async findAll() {
    const rows = await this.ds.query(
      `SELECT
         l.id, l.employee_id, l.amount_of_loan, l.loan_from_company, l.date_of_the_loan,
         l.name_of_bank, l.interest_of_bank, l.status, l.payment_date, l.payment_status, l.payment_type,
         l.receipt_image,
         e.name AS employee_name,
         (SELECT p.payment_date FROM payrolls p WHERE p.loan_id = l.id ORDER BY p.payment_date DESC LIMIT 1) AS latest_payment_date,
         (SELECT p.cash_advance FROM payrolls p WHERE p.loan_id = l.id ORDER BY p.payment_date DESC LIMIT 1) AS latest_payment_amount,
         (SELECT SUM(p2.cash_advance) FROM payrolls p2 WHERE p2.loan_id = l.id) AS total_paid
       FROM loans l
       LEFT JOIN employees e ON e.id = l.employee_id
       ORDER BY l.id DESC`,
    );

    return rows.map((r: any) => ({
      ...r,
      available_balance:
        r.loan_from_company === 'EPERC'
          ? Number(r.amount_of_loan) - Number(r.total_paid || 0)
          : null,
    }));
  }

  async create(body: any) {
    const res = await this.ds.query(
      `INSERT INTO loans
        (user_id, employee_id, amount_of_loan, loan_from_company, date_of_the_loan,
         name_of_bank, interest_of_bank, status, payment_date, payment_status, payment_type, receipt_image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        body.user_id ?? null,
        body.employee_id,
        body.amount_of_loan,
        body.loan_from_company,
        body.date_of_the_loan,
        body.name_of_bank ?? null,
        body.interest_of_bank ?? null,
        body.status ?? 1,
        body.payment_date,
        body.payment_status ?? 'pending',
        body.payment_type ?? 'Cash',
        body.receipt_image ?? null,
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
    await this.ds.query(`UPDATE loans SET ${fields} WHERE id = ?`, [...values, id]);
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query(`DELETE FROM loans WHERE id = ?`, [id]);
    return { ok: true };
  }
}
