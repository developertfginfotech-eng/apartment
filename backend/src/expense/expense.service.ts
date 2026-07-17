import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Expense } from './expense.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense) private repo: Repository<Expense>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async findAll(from?: string, to?: string, search?: string) {
    const conditions: string[] = ['e.status = 1'];
    const bindings: any[] = [];

    if (from) { conditions.push('e.date >= ?'); bindings.push(from); }
    if (to)   { conditions.push('e.date <= ?'); bindings.push(to); }
    if (search) {
      conditions.push('(e.title LIKE ? OR p.property_name LIKE ? OR gt.name LIKE ? OR f.name LIKE ? OR pu.name LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    return this.ds.query(
      `SELECT
         e.id, e.date, e.title, e.type, e.sub_category, e.property_id, e.floor_id, e.unit_id,
         e.amount, e.tax, e.famount, e.description, e.status,
         p.property_name,
         f.name AS floor_name,
         pu.name AS unit_name,
         gt.name AS type_name,
         gs.name AS sub_category_name
       FROM tbl_expenses e
       LEFT JOIN tbl_properties p ON p.id = e.property_id
       LEFT JOIN tbl_property_floors f ON f.id = e.floor_id
       LEFT JOIN tbl_property_units pu ON pu.id = e.unit_id
       LEFT JOIN tbl_general_expenses gt ON gt.id = e.type
       LEFT JOIN tbl_general_expenses gs ON gs.id = e.sub_category
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.date DESC, e.id DESC`,
      bindings,
    );
  }

  findOne(id: number) { return this.repo.findOne({ where: { id } }); }

  async create(dto: Partial<Expense>) {
    const saved = await this.repo.save(this.repo.create(dto));
    await this.notifications.notify('expense', 'New expense added', `${saved.title ?? 'An expense'} was added`);
    return saved;
  }

  async update(id: number, dto: Partial<Expense>) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.save({ ...e, ...dto });
  }

  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    e.status = 0;
    return this.repo.save(e);
  }
}
