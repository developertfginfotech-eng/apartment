import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_vendors')
export class Vendor {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) name: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) tin: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
