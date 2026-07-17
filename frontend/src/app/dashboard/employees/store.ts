export interface Employee {
  id: string; name: string; position: string; department: string
  email: string; phone: string; salary: number; joinDate: string
  status: 'active' | 'inactive'
}

export const DEPARTMENTS = ['Operations', 'Finance', 'Admin', 'Sales', 'HR']

const SEED: Employee[] = [
  { id: 'emp1', name: 'Carlos Mendez', position: 'Property Manager', department: 'Operations', email: 'carlos@apartment.local', phone: '+1-555-0201', salary: 25000, joinDate: '2023-03-15', status: 'active' },
  { id: 'emp2', name: 'Diana Park', position: 'Finance Officer', department: 'Finance', email: 'diana@apartment.local', phone: '+1-555-0202', salary: 35000, joinDate: '2022-07-01', status: 'active' },
  { id: 'emp3', name: 'Felix Osei', position: 'Maintenance Tech', department: 'Operations', email: 'felix@apartment.local', phone: '+1-555-0203', salary: 18000, joinDate: '2024-01-10', status: 'active' },
  { id: 'emp4', name: 'Aiko Tanaka', position: 'Admin Assistant', department: 'Admin', email: 'aiko@apartment.local', phone: '+1-555-0204', salary: 28000, joinDate: '2021-11-20', status: 'inactive' },
  { id: 'emp5', name: 'Grace Mensah', position: 'Leasing Agent', department: 'Sales', email: 'grace@apartment.local', phone: '+1-555-0205', salary: 22000, joinDate: '2023-09-05', status: 'active' },
]

const KEY = 'apt_employees_mock'

export function loadEmployees(): Employee[] {
  if (typeof window === 'undefined') return SEED
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return SEED
}

export function saveEmployees(list: Employee[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}
