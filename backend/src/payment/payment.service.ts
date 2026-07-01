import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';

@Injectable()
export class PaymentService {
  constructor(@InjectRepository(Payment) private repo: Repository<Payment>) {}

  findAll()               { return this.repo.find({ order: { created_at: 'DESC' } }); }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Payment>) { return this.repo.save(this.repo.create(dto)); }
  async update(id: number, dto: Partial<Payment>) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.save({ ...e, ...dto });
  }
  async remove(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    return this.repo.remove(e);
  }
}
