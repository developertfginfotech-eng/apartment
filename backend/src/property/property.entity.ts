import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_properties')
export class Property {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) landlord_id: number;
  @Column({ nullable: true }) property_type: string;
  @Column({ nullable: true }) property_name: string;
  @Column({ nullable: true }) property_code: string;
  @Column({ type: 'text', nullable: true }) address: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
