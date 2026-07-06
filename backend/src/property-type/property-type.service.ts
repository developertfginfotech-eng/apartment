import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PropertyTypeService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  findAll() {
    return this.ds.query(
      `SELECT id, name FROM tbl_property_types WHERE status = 1 ORDER BY name ASC`,
    );
  }
}
