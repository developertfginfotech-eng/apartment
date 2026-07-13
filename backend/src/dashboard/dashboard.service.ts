import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // Mirrors GlobalFunction::TotalDueRent() from the reference Laravel app:
  // walks every lease month-by-month from start_date (pinned to due_on) through
  // min(end_date, now), netting the monthly rent against any matching payment.
  private async totalDueRent() {
    const leases = await this.db.query(
      `SELECT id, start_date, end_date, due_on, rent_amount FROM tbl_leases`,
    );
    const payRents = await this.db.query(
      `SELECT lease_id, payment_month, amount FROM tbl_pay_rents`,
    );

    const payMap = new Map<string, number>();
    for (const p of payRents) {
      const key = `${p.lease_id}|${p.payment_month}`;
      if (!payMap.has(key)) payMap.set(key, parseFloat(p.amount) || 0);
    }

    const now = new Date();
    let total = 0;
    for (const lease of leases) {
      if (!lease.start_date) continue;
      const start = new Date(lease.start_date);
      const dueOn = parseInt(lease.due_on, 10) || 1;
      const monthlyRent = parseFloat(lease.rent_amount) || 0;
      const end = lease.end_date && new Date(lease.end_date) < now ? new Date(lease.end_date) : now;

      let cursor = new Date(start.getFullYear(), start.getMonth(), dueOn);
      while (cursor <= end) {
        const paid = payMap.get(`${lease.id}|${ymKey(cursor)}`);
        total += paid !== undefined ? monthlyRent - paid : monthlyRent;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, dueOn);
      }
    }
    return total;
  }

  async getStats() {
    const q = (sql: string) => this.db.query(sql);

    const [[props], [renters], [onRent], [availableRows], [maint], [rentPaid], [leaseCount],
           recentRenters, expiredLeases,
           [utilDue], [utilReceived], [maintDue], [maintReceived], [expense],
           dueRent] = await Promise.all([
      q(`SELECT COUNT(*) as total FROM tbl_properties`),
      q(`SELECT COUNT(*) as total FROM tbl_renters WHERE status=1`),
      q(`SELECT COUNT(*) as total FROM tbl_leases WHERE status=1`),
      q(`SELECT COUNT(DISTINCT pu.property_id) as total
         FROM tbl_property_units pu
         LEFT JOIN tbl_lease_units lu ON lu.property_id = pu.property_id AND lu.unit_id = pu.id
         JOIN tbl_properties p ON p.id = pu.property_id AND p.status = 1
         WHERE lu.unit_id IS NULL`),
      q(`SELECT
          COUNT(*) as total,
          SUM(CASE WHEN maintenances_status=0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN maintenances_status=2 THEN 1 ELSE 0 END) as completed
         FROM tbl_maintenances`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total FROM tbl_pay_rents`),
      q(`SELECT COUNT(*) as total FROM tbl_leases`),
      q(`SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', r.first_name, r.last_name)), ''), r.name) as name,
                p.property_name, f.name as floor_name, u.name as unit_name, r.renter_status
         FROM tbl_renters r
         LEFT JOIN tbl_properties p ON p.id = r.property_id
         LEFT JOIN tbl_property_floors f ON f.id = r.floor_id
         LEFT JOIN tbl_property_units u ON u.id = r.unit_id
         WHERE r.status=1 ORDER BY r.id DESC LIMIT 10`),
      q(`SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', r.first_name, r.last_name)), ''), r.name) as renter_name,
                p.property_name, l.rent_amount, l.status
         FROM tbl_leases l
         LEFT JOIN tbl_renters r ON r.id = l.renter_id
         LEFT JOIN tbl_properties p ON p.id = l.property_id
         WHERE l.status=0 ORDER BY l.id DESC LIMIT 10`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_rent),0) as total FROM tbl_utilities WHERE payment_status=0`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_rent),0) as total FROM tbl_utilities WHERE payment_status=1`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(CAST(amount AS DECIMAL(15,2))),0) as total FROM tbl_maintenances WHERE payment_status=0`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(CAST(amount AS DECIMAL(15,2))),0) as total FROM tbl_maintenances WHERE payment_status=1`),
      q(`SELECT COALESCE(SUM(amount),0) as total FROM tbl_expenses`),
      this.totalDueRent(),
    ]);

    const dueUtility = +utilDue.total;
    const dueMaintenance = +maintDue.total;
    const amountReceived = +rentPaid.total + (+utilReceived.total) + (+maintReceived.total);

    return {
      properties: { total: +props.total, onRent: +onRent.total, available: +availableRows.total },
      renters: { total: +renters.total },
      maintenance: { total: +maint.total, pending: +maint.pending, completed: +maint.completed },
      payments: {
        received: { count: +rentPaid.cnt, amount: +rentPaid.total },
        pending: { count: +leaseCount.total, amount: dueRent },
      },
      utilities: {
        due: { count: +utilDue.cnt, amount: dueUtility },
        received: { count: +utilReceived.cnt, amount: +utilReceived.total },
      },
      maintenanceCost: {
        due: { count: +maintDue.cnt, amount: dueMaintenance },
        received: { count: +maintReceived.cnt, amount: +maintReceived.total },
      },
      amountReceived,
      amountDue: dueRent,
      dueBreakdown: { rent: dueRent, utility: dueUtility, maintenance: dueMaintenance, total: dueRent + dueUtility + dueMaintenance },
      totalExpense: +expense.total,
      recentRenters,
      expiredLeases,
    };
  }
}
