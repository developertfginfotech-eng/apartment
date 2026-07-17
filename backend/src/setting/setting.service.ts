import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Setting } from './setting.entity';

@Injectable()
export class SettingService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting) private repo: Repository<Setting>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS \`tbl_settings\` (
        \`id\` int NOT NULL,
        \`company_name\` varchar(255) DEFAULT NULL,
        \`logo\` varchar(255) DEFAULT NULL,
        \`email\` varchar(255) DEFAULT NULL,
        \`phone\` varchar(255) DEFAULT NULL,
        \`currency\` varchar(20) DEFAULT NULL,
        \`physical_address\` varchar(255) DEFAULT NULL,
        \`postal_address\` varchar(255) DEFAULT NULL,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
    await this.ds.query(`INSERT IGNORE INTO \`tbl_settings\` (id) VALUES (1)`);
  }

  async get() {
    return this.repo.findOne({ where: { id: 1 } });
  }

  async update(dto: Partial<Setting>) {
    const s = (await this.repo.findOne({ where: { id: 1 } })) ?? { id: 1 };
    return this.repo.save({ ...s, ...dto, id: 1 });
  }
}
