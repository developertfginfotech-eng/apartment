import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async getStats() {
    const q = (sql: string) => this.db.query(sql);

    const [[props], [renters], [maint], [rentPaid], [rentPending],
           recentRenters, expiredLeases, [received], [due]] = await Promise.all([
      q(`SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) as active
         FROM tbl_properties`),
      q(`SELECT COUNT(*) as total FROM tbl_renters WHERE status=1`),
      q(`SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status=0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) as completed
         FROM tbl_maintenances`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total FROM tbl_pay_rents WHERE status=1`),
      q(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total FROM tbl_pay_rents WHERE status=0`),
      q(`SELECT r.name, p.property_name, f.name as floor_name, u.name as unit_name, r.renter_status
         FROM tbl_renters r
         LEFT JOIN tbl_properties p ON p.id = r.property_id
         LEFT JOIN tbl_property_floors f ON f.id = r.floor_id
         LEFT JOIN tbl_property_units u ON u.id = r.unit_id
         WHERE r.status=1 ORDER BY r.id DESC LIMIT 10`),
      q(`SELECT r.name as renter_name, p.property_name, l.rent_amount, l.status
         FROM tbl_leases l
         LEFT JOIN tbl_renters r ON r.id = l.user_id
         LEFT JOIN tbl_properties p ON p.id = l.property_id
         WHERE l.status=0 ORDER BY l.id DESC LIMIT 10`),
      q(`SELECT COALESCE(SUM(amount),0) as total FROM tbl_pay_rents WHERE status=1`),
      q(`SELECT COALESCE(SUM(CAST(rent_per_month AS DECIMAL(15,2))),0) as due FROM tbl_renters WHERE renter_status=1 AND status=1`),
    ]);

    return {
      properties: { total: +props.total, active: +props.active },
      renters: { total: +renters.total },
      maintenance: { total: +maint.total, pending: +maint.pending, completed: +maint.completed },
      payments: {
        received: { count: +rentPaid.cnt, amount: +rentPaid.total },
        pending: { count: +rentPending.cnt, amount: +rentPending.total },
      },
      amountReceived: +received.total,
      amountDue: +due.due,
      recentRenters,
      expiredLeases,
    };
  }
}
