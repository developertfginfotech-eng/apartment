export const MODULES = [
  'properties', 'owners', 'tenants', 'leases', 'payments', 'maintenance', 'vendors',
  'expenses', 'utilities', 'messages', 'notice-board', 'reports',
  'activity-logs', 'loan', 'security-money', 'payroll', 'taxes', 'settings',
]
export const MODULE_LABELS: Record<string, string> = {
  properties: 'Properties', owners: 'Owners', tenants: 'Renters', leases: 'Lease Agreement',
  payments: 'Payments', maintenance: 'Maintenance', vendors: 'Vendors', expenses: 'Expenses', utilities: 'Utilities',
  messages: 'Messages', 'notice-board': 'Notice Board', reports: 'Reports',
  'activity-logs': 'Activity Logs', loan: 'Loan', 'security-money': 'Security Money',
  payroll: 'Payroll', taxes: 'Taxes', settings: 'Setting',
}
export const ACTIONS = ['read', 'create', 'update', 'delete']

export interface Admin {
  id: string
  name: string
  email: string
  role: string
  permissions: { module: string; actions: string[] }[]
  createdAt: string
}
