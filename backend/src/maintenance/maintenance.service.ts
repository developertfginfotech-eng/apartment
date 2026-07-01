import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './maintenance.entity';

@Injectable()
export class MaintenanceService {
  constructor(@InjectRepository(Maintenance) private repo: Repository<Maintenance>) {}

  findAll()               { return this.repo.find({ order: { created_at: 'DESC' } }); }
  findOne(id: number)     { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Maintenance>) { return this.repo.save(this.repo.create(dto)); }
  async update(id: number, dto: Partial<Maintenance>) {
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
