import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface DateRange { from?: string; to?: string; search?: string }

@Injectable()
export class ReportService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async propertyReport() {
    return this.ds.query(`
      SELECT
        p.id, p.property_name, p.property_code, p.address,
        COUNT(DISTINCT pf.id) AS total_floor,
        COUNT(DISTINCT pu.id) AS total_unit,
        COUNT(DISTINCT r.id)  AS total_renter
      FROM tbl_properties p
      LEFT JOIN tbl_property_floors pf ON pf.property_id = p.id AND pf.status = 1
      LEFT JOIN tbl_property_units pu  ON pu.property_id = p.id AND pu.status = 1
      LEFT JOIN tbl_renters r ON r.property_id = p.id AND r.status = 1
      WHERE p.status = 1
      GROUP BY p.id
      ORDER BY p.id ASC
    `);
  }

  async outstandingLedger({ from, to, search }: DateRange) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];

    if (from) { conditions.push('tl.lastbill_date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('tl.lastbill_date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(tl.lease_no LIKE ? OR tp.property_name LIKE ? OR tr.first_name LIKE ? OR tpf.name LIKE ?)');
      bindings.push(...Array(4).fill(`%${search}%`));
    }

    return this.ds.query(`
      SELECT
        tl.id AS lease_id, tl.lease_no, tl.amount, tl.lastbill_date, tl.total_rent AS lease_total_rent,
        tp.property_name, tr.first_name AS renter_name, tr.id AS renter_id, tpf.name AS floor_name,
        GROUP_CONCAT(DISTINCT tpu.name SEPARATOR ', ') AS unit_name,
        MAX(tpr.paid_amount) AS paid_amount
      FROM tbl_leases tl
      JOIN tbl_properties tp ON tp.id = tl.property_id
      JOIN tbl_renters tr ON tr.id = tl.renter_id
      LEFT JOIN tbl_property_floors tpf ON tpf.id = tl.floor_id
      LEFT JOIN tbl_lease_units tlu ON tlu.lease_id = tl.id
      LEFT JOIN tbl_property_units tpu ON tpu.id = tlu.unit_id
      LEFT JOIN (SELECT lease_id, SUM(amount) AS paid_amount FROM tbl_pay_rents GROUP BY lease_id) tpr ON tpr.lease_id = tl.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY tl.id
      ORDER BY tl.id DESC
    `, bindings);
  }

  async financialReport({ from, to }: DateRange) {
    const conditions: string[] = ['p.status = 1'];
    const bindings: any[] = [];
    if (from) { conditions.push('p.created_at >= ?'); bindings.push(from); }
    if (to)   { conditions.push('p.created_at <= ?'); bindings.push(to); }

    return this.ds.query(`
      SELECT
        p.id, p.property_name, p.ownership_percentage,
        COALESCE(pay.pay_amount, 0)   AS pay_amount,
        COALESCE(exp.expenses, 0)     AS expenses,
        COALESCE(m.owner_maintenance, 0)  AS owner_maintenance,
        COALESCE(m.renter_maintenance, 0) AS renter_maintenance,
        COALESCE(dep.deposit, 0)      AS deposit
      FROM tbl_properties p
      LEFT JOIN (SELECT property_id, SUM(amount) AS pay_amount FROM tbl_pay_rents GROUP BY property_id) pay ON pay.property_id = p.id
      LEFT JOIN (SELECT property_id, SUM(amount) AS expenses FROM tbl_expenses GROUP BY property_id) exp ON exp.property_id = p.id
      LEFT JOIN (
        SELECT property_id,
               SUM(CASE WHEN maintenance_by = 0 THEN amount ELSE 0 END) AS owner_maintenance,
               SUM(CASE WHEN maintenance_by = 1 THEN amount ELSE 0 END) AS renter_maintenance
        FROM tbl_maintenances GROUP BY property_id
      ) m ON m.property_id = p.id
      LEFT JOIN (SELECT property_id, SUM(rent_deposit) AS deposit FROM tbl_leases GROUP BY property_id) dep ON dep.property_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.id DESC
    `, bindings);
  }

  async collectionReport({ from, to, search }: DateRange) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];
    if (from) { conditions.push('rp.payment_date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('rp.payment_date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(l.lease_no LIKE ? OR p.property_name LIKE ? OR r.first_name LIKE ?)');
      bindings.push(...Array(3).fill(`%${search}%`));
    }

    return this.ds.query(`
      SELECT
        l.id AS lease_id, l.lease_no, p.property_name, tpf.name AS floor_name,
        GROUP_CONCAT(DISTINCT tpu.name SEPARATOR ', ') AS unit_name, r.first_name AS renter_name,
        MAX(rp.payment_date) AS max_payment_date,
        SUM(rp.amount) AS total_paid_amount
      FROM tbl_leases l
      LEFT JOIN tbl_pay_rents rp ON l.id = rp.lease_id
      LEFT JOIN tbl_property_floors tpf ON tpf.id = l.floor_id
      LEFT JOIN tbl_lease_units tlu ON tlu.lease_id = l.id
      LEFT JOIN tbl_property_units tpu ON tpu.id = tlu.unit_id
      JOIN tbl_properties p ON p.id = l.property_id
      JOIN tbl_renters r ON r.id = l.renter_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY l.id, r.first_name, p.property_name
      ORDER BY l.id DESC
    `, bindings);
  }

  async utilityReport({ from, to }: DateRange) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];
    if (from && to) { conditions.push('u.issue_date BETWEEN ? AND ?'); bindings.push(from, to); }

    return this.ds.query(`
      SELECT
        p.id, p.property_name,
        SUM(u.water_bill+0)    AS water_bill,
        SUM(u.gas_bill+0)      AS gas_bill,
        SUM(u.security_bill+0) AS security_bill,
        SUM(u.utility_bill+0)  AS utility_bill,
        SUM(u.other_bill+0)    AS other_bill,
        SUM(u.total_rent+0)    AS total_rent
      FROM tbl_properties p
      LEFT JOIN tbl_utilities u ON u.property_id = p.id AND ${conditions.join(' AND ')}
      WHERE p.status = 1
      GROUP BY p.id
      ORDER BY p.id DESC
    `, bindings);
  }

  async expensesReport({ from, to, search }: DateRange, wtaxOnly = false) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];
    if (wtaxOnly) conditions.push('e.sub_category = 50');
    if (from) { conditions.push('e.date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('e.date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(e.title LIKE ? OR p.property_name LIKE ? OR ge.name LIKE ? OR pf.name LIKE ? OR pu.name LIKE ?)');
      bindings.push(...Array(5).fill(`%${search}%`));
    }

    return this.ds.query(`
      SELECT
        e.id, e.title, e.date, e.amount,
        p.property_name, pf.name AS floor_name, pu.name AS unit_name, ge.name AS category
      FROM tbl_expenses e
      LEFT JOIN tbl_properties p ON p.id = e.property_id
      LEFT JOIN tbl_property_floors pf ON pf.id = e.floor_id
      LEFT JOIN tbl_property_units pu ON pu.id = e.unit_id
      LEFT JOIN tbl_general_expenses ge ON ge.id = e.type
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.id DESC
    `, bindings);
  }

  async vatReport({ from, to, search }: DateRange) {
    return this.leaseTaxReport({ from, to, search }, 'tax');
  }

  async wtaxIncomeReport({ from, to, search }: DateRange) {
    return this.leaseTaxReport({ from, to, search }, 'wtax');
  }

  private async leaseTaxReport({ from, to, search }: DateRange, taxColumn: 'tax' | 'wtax') {
    const conditions: string[] = [`l.${taxColumn} IS NOT NULL`];
    const bindings: any[] = [];
    if (from) { conditions.push('rp.payment_date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('rp.payment_date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(l.lease_no LIKE ? OR p.property_name LIKE ? OR r.first_name LIKE ?)');
      bindings.push(...Array(3).fill(`%${search}%`));
    }

    return this.ds.query(`
      SELECT
        l.id AS lease_id, l.lease_no, p.property_name, tpf.name AS floor_name,
        GROUP_CONCAT(DISTINCT tpu.name SEPARATOR ', ') AS unit_name, r.first_name AS renter_name,
        MAX(rp.payment_date) AS max_payment_date,
        ROUND((l.amount * l.${taxColumn} / 100) * COUNT(rp.id), 2) AS total_paid_amount
      FROM tbl_leases l
      LEFT JOIN tbl_pay_rents rp ON l.id = rp.lease_id
      LEFT JOIN tbl_property_floors tpf ON tpf.id = l.floor_id
      LEFT JOIN tbl_lease_units tlu ON tlu.lease_id = l.id
      LEFT JOIN tbl_property_units tpu ON tpu.id = tlu.unit_id
      JOIN tbl_properties p ON p.id = l.property_id
      JOIN tbl_renters r ON r.id = l.renter_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY l.id, r.first_name, p.property_name
      ORDER BY l.id DESC
    `, bindings);
  }

  async parkingReport({ from, to, search }: DateRange) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];
    if (from) { conditions.push('pk.payment_date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('pk.payment_date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(pk.price LIKE ? OR p.property_name LIKE ? OR r.first_name LIKE ?)');
      bindings.push(...Array(3).fill(`%${search}%`));
    }

    return this.ds.query(`
      SELECT pk.id, pk.price, pk.payment_date, pk.payment_status, p.property_name, r.first_name AS renter_name
      FROM parkings pk
      LEFT JOIN tbl_properties p ON p.id = pk.property_id
      LEFT JOIN tbl_renters r ON r.id = pk.renter_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pk.id DESC
    `, bindings);
  }

  async refundDepositReport({ from, to, search }: DateRange) {
    const conditions: string[] = ['1=1'];
    const bindings: any[] = [];
    if (from) { conditions.push('rs.payment_date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('rs.payment_date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(rs.amount LIKE ? OR p.property_name LIKE ? OR r.first_name LIKE ?)');
      bindings.push(...Array(3).fill(`%${search}%`));
    }

    return this.ds.query(`
      SELECT rs.id, rs.amount, rs.payment_date, rs.payment_status, p.property_name, r.first_name AS renter_name
      FROM refund_security_money rs
      LEFT JOIN tbl_leases l ON l.id = rs.lease_id
      LEFT JOIN tbl_properties p ON p.id = l.property_id
      LEFT JOIN tbl_renters r ON r.id = l.renter_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY rs.id DESC
    `, bindings);
  }
}
