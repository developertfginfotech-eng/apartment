import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_leases')
export class Lease {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) property_id: number;
  @Column({ nullable: true }) lease_no: string;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) rent_amount: string;
  @Column({ nullable: true }) start_date: string;
  @Column({ nullable: true }) lastbill_date: string;
  @Column({ nullable: true }) due_on: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
