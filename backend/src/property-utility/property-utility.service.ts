import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PropertyUtilityService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  findAll() {
    return this.ds.query(
      `SELECT id, name, display_name, status FROM tbl_property_utilities WHERE status = 1 ORDER BY display_name ASC`,
    );
  }
}
