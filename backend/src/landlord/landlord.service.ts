import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Landlord } from './landlord.entity';

@Injectable()
export class LandlordService {
  constructor(@InjectRepository(Landlord) private repo: Repository<Landlord>) {}

  findAll() { return this.repo.find({ order: { id: 'DESC' } }); }
  findOne(id: number) { return this.repo.findOne({ where: { id } }); }
  create(dto: Partial<Landlord>) { return this.repo.save(this.repo.create({ ...dto, status: 1 })); }
  async update(id: number, dto: Partial<Landlord>) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.repo.save({ ...r, ...dto });
  }
  async remove(id: number) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.repo.remove(r);
  }
}
