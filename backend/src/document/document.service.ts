import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DocumentService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  getTypes() {
    return this.ds.query(`SELECT id, name FROM tbl_documents WHERE status = 1 ORDER BY name ASC`);
  }

  // table/fkColumn are fixed internal constants, never derived from request input
  private getDocuments(table: string, fkColumn: string, fkId: number) {
    return this.ds.query(
      `SELECT d.id, d.document_type, d.document, dt.name AS document_type_name
       FROM ${table} d
       LEFT JOIN tbl_documents dt ON dt.id = d.document_type
       WHERE d.${fkColumn} = ? AND d.status = 1
       ORDER BY d.id DESC`,
      [fkId],
    );
  }

  private async addDocument(table: string, fkColumn: string, fkId: number, documentType: number, document: string) {
    const res = await this.ds.query(
      `INSERT INTO ${table} (${fkColumn}, document_type, document, status) VALUES (?,?,?,1)`,
      [fkId, documentType, document],
    );
    return { id: res.insertId };
  }

  private async removeDocument(table: string, id: number) {
    await this.ds.query(`UPDATE ${table} SET status = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }

  getPropertyDocuments(propertyId: number) { return this.getDocuments('tbl_property_documents', 'property_id', propertyId); }
  addPropertyDocument(body: { property_id: number; document_type: number; document: string }) {
    return this.addDocument('tbl_property_documents', 'property_id', body.property_id, body.document_type, body.document);
  }
  removePropertyDocument(id: number) { return this.removeDocument('tbl_property_documents', id); }

  getLandlordDocuments(landlordId: number) { return this.getDocuments('tbl_landlord_documents', 'landlord_id', landlordId); }
  addLandlordDocument(body: { landlord_id: number; document_type: number; document: string }) {
    return this.addDocument('tbl_landlord_documents', 'landlord_id', body.landlord_id, body.document_type, body.document);
  }
  removeLandlordDocument(id: number) { return this.removeDocument('tbl_landlord_documents', id); }

  getRenterDocuments(renterId: number) { return this.getDocuments('tbl_renter_documents', 'renter_id', renterId); }
  addRenterDocument(body: { renter_id: number; document_type: number; document: string }) {
    return this.addDocument('tbl_renter_documents', 'renter_id', body.renter_id, body.document_type, body.document);
  }
  removeRenterDocument(id: number) { return this.removeDocument('tbl_renter_documents', id); }
}
