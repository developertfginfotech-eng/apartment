import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vendor } from './vendor.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class VendorService implements OnModuleInit {
  constructor(
    @InjectRepository(Vendor) private repo: Repository<Vendor>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_vendors\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) DEFAULT NULL,
        \`address\` varchar(500) DEFAULT NULL,
        \`tin\` varchar(50) DEFAULT NULL,
        \`phone\` varchar(50) DEFAULT NULL,
        \`email\` varchar(255) DEFAULT NULL,
        \`status\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
  }

  async findAll(search?: string) {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(v => (v.name ?? '').toLowerCase().includes(q));
  }

  findOne(id: number) { return this.repo.findOne({ where: { id } }); }

  async create(dto: Partial<Vendor>) {
    const saved = await this.repo.save(this.repo.create(dto));
    await this.notifications.notify('vendor', 'New vendor added', `${saved.name ?? 'A vendor'} was added`);
    return saved;
  }

  async update(id: number, dto: Partial<Vendor>) {
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
