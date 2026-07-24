import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Matches the flat permission-string list from the legacy "Give Permission
// To Owner/Renter" screen (tbl_permissions, seeded directly in the legacy DB
// with no tracked migration/seeder) — reproduced here as the single source
// of truth for the new app's equivalent role-permission catalog.
export const PERMISSION_CATALOG: string[] = [
  'create-owner', 'create-properties', 'create-documents', 'view-dashboard', 'view-renters',
  'create-renters', 'view-leases', 'edit-expenses', 'delete-utilities', 'create-leases',
  'create-maintenance-type', 'view-expense-type', 'view-user-roles', 'view-renters-own', 'view-dashboard-own',
  'view-settings-own', 'set-owners-permission', 'view-tax', 'edit-parking', 'delete-generalexpense',
  'edit-wtax', 'create-transaction', 'view-inactive-leases-own', 'view-loan', 'delete-loan',
  'view-salary_structure', 'escalation-leases', 'delete-employee', 'show-payroll', 'delete-managepayroll',
  'view-owner', 'view-properties', 'view-documents', 'view-properties-own', 'view-maintenances',
  'create-maintenances', 'edit-maintenances', 'delete-expenses', 'edit-leases', 'create-property-type',
  'view-maintenance-type', 'create-expense-type', 'view-payments', 'view-owner-own', 'view-maintenances-own',
  'view-notice-board-own', 'view-activity-logs', 'edit-tax', 'delete-parking', 'create-generalexpenses',
  'delete-wtax', 'edit-transaction', 'refund-deposit', 'view-loan-own', 'view-security-money',
  'edit-salary_structure', 'view-employee', 'show-employee', 'delete-payroll', 'view-payslip',
  'edit-owner', 'edit-properties', 'edit-documents', 'view-settings', 'view-expenses',
  'edit-renters', 'delete-maintenances', 'create-utilities', 'delete-leases', 'edit-property-type',
  'edit-maintenance-type', 'edit-expense-type', 'view-notice-board', 'view-document-own', 'view-reports-own',
  'view-payment-own', 'view-activity-logs-own', 'create-parking', 'view-parking-own', 'view-wtax',
  'edit-payments', 'delete-transaction', 'delete-notice-board', 'edit-loan', 'view-security-money-own',
  'delete-salary_structure', 'create-employee', 'create-payroll', 'view-managepayroll',
  'delete-owner', 'delete-properties', 'delete-documents', 'view-reports', 'view-utilities',
  'delete-renters', 'create-expenses', 'edit-utilities', 'rent-collect-leases', 'delete-property-type',
  'delete-maintenance-type', 'delete-expense-type', 'view-expenses-own', 'view-leases-own', 'view-utilities-own',
  'set-renters-permission', 'create-tax', 'view-parking', 'edit-generalexpense', 'create-wtax',
  'renew-leases', 'view-inactive-leases', 'create-loan', 'show-loan', 'view-payroll',
  'create-salary_structure', 'edit-employee', 'edit-payroll', 'show-managepayroll',
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`app_role_permissions\` (
        \`role\` varchar(20) NOT NULL,
        \`permission\` varchar(100) NOT NULL,
        PRIMARY KEY (\`role\`, \`permission\`)
      )
    `);
  }

  getCatalog() {
    return PERMISSION_CATALOG;
  }

  async getGranted(role: string) {
    const rows = await this.ds.query(`SELECT permission FROM app_role_permissions WHERE role = ?`, [role]);
    return rows.map((r: { permission: string }) => r.permission);
  }

  async setGranted(role: string, permissions: string[]) {
    await this.ds.query(`DELETE FROM app_role_permissions WHERE role = ?`, [role]);
    const valid = permissions.filter(p => PERMISSION_CATALOG.includes(p));
    for (const permission of valid) {
      await this.ds.query(`INSERT INTO app_role_permissions (role, permission) VALUES (?, ?)`, [role, permission]);
    }
    return { ok: true };
  }
}
