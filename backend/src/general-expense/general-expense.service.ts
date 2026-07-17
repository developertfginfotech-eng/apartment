import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralExpense } from './general-expense.entity';

@Injectable()
export class GeneralExpenseService {
  constructor(@InjectRepository(GeneralExpense) private repo: Repository<GeneralExpense>) {}

  findAll() {
    return this.repo.find({ where: { status: 1 }, order: { name: 'ASC' } });
  }

  findOne(id: number) { return this.repo.findOne({ where: { id } }); }

  create(dto: Partial<GeneralExpense>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<GeneralExpense>) {
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
