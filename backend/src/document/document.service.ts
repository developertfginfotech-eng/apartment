import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DocumentService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  getTypes() {
    return this.ds.query(`SELECT id, name FROM tbl_documents WHERE status = 1 ORDER BY name ASC`);
  }

  getPropertyDocuments(propertyId: number) {
    return this.ds.query(
      `SELECT pd.id, pd.document_type, pd.document, d.name AS document_type_name
       FROM tbl_property_documents pd
       LEFT JOIN tbl_documents d ON d.id = pd.document_type
       WHERE pd.property_id = ? AND pd.status = 1
       ORDER BY pd.id DESC`,
      [propertyId],
    );
  }

  async addPropertyDocument(body: { property_id: number; document_type: number; document: string }) {
    const res = await this.ds.query(
      `INSERT INTO tbl_property_documents (property_id, document_type, document, status) VALUES (?,?,?,1)`,
      [body.property_id, body.document_type, body.document],
    );
    return { id: res.insertId };
  }

  async removePropertyDocument(id: number) {
    await this.ds.query(`UPDATE tbl_property_documents SET status = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }
}
