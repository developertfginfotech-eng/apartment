import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Renter } from './renter.entity';

@Injectable()
export class RenterService {
  constructor(@InjectRepository(Renter) private repo: Repository<Renter>) {}

  async findAll() {
    const renters = await this.repo.find({ order: { first_name: 'ASC' } });
    return renters.map(r => ({
      ...r,
      name: r.first_name
        ? [r.first_name, r.last_name].filter(Boolean).join(' ')
        : (r.name ?? ''),
    }));
  }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Renter>) { return this.repo.save(this.repo.create(dto)); }
  async update(id: number, dto: Partial<Renter>) {
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
