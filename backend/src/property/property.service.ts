import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property) private repo: Repository<Property>,
  ) {}

  findAll() {
    return this.repo.find({ where: { status: 1 }, order: { property_name: 'ASC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  create(dto: Partial<Property>) {
    const p = this.repo.create({ ...dto, status: 1 });
    return this.repo.save(p);
  }

  async update(id: number, dto: Partial<Property>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return this.repo.save({ ...p, ...dto });
  }

  async remove(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return this.repo.remove(p);
  }
}
