import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_leases')
export class Lease {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) renter_id: number;
  @Column({ nullable: true }) property_id: number;
  @Column({ nullable: true }) floor_id: string;
  @Column({ nullable: true }) lease_no: string;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) amount: string;
  @Column({ nullable: true }) is_parking: string;
  @Column({ nullable: true }) rent_amount: string;
  @Column({ nullable: true }) maintenance: string;
  @Column({ nullable: true }) tax: string;
  @Column({ nullable: true }) wtax_applicable: string;
  @Column({ nullable: true }) wtax: string;
  @Column({ nullable: true }) rent_deposit: string;
  @Column({ nullable: true }) document_image: string;
  @Column({ nullable: true }) receipt_image: string;
  @Column({ nullable: true }) start_date: string;
  @Column({ nullable: true }) end_date: string;
  @Column({ nullable: true }) lastbill_date: string;
  @Column({ nullable: true }) due_on: string;
  @Column({ nullable: true }) total_rent: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) remaining_amount: string;
  @Column({ nullable: true }) payment_type: string;
  @Column({ nullable: true }) payment_status: string;
  @Column({ nullable: true }) paid_till_date: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
