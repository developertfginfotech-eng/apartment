import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) property_id: number;
  @Column({ nullable: true }) floor_id: number;
  @Column({ nullable: true }) unit_id: number;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) title: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) famount: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) tax: string;
  @Column({ nullable: true }) amount: string;
  @Column({ nullable: true }) date: string;
  @Column({ nullable: true }) month: string;
  @Column({ nullable: true }) year: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ default: 1 }) status: number;
  @Column({ nullable: true }) maintenance_by: string;
  @Column({ nullable: true }) maintenances_paid_by: number;
  @Column({ default: 0 }) maintenances_status: number;
  @Column({ nullable: true }) reject_details: string;
  @Column({ nullable: true }) payment_type: string;
  @Column({ default: 0 }) payment_status: number;
  @Column({ nullable: true }) receipt_image: string;
  @Column({ type: 'text', nullable: true }) cheque_details: string;
  @Column({ nullable: true }) cheque_image: string;
  @Column({ nullable: true }) online_details: string;
  @Column({ nullable: true }) online_image: string;
  @Column({ type: 'text', nullable: true }) pdc_cheque_details: string;
  @Column({ nullable: true }) pdc_cheque_image: string;
  @Column({ type: 'date', nullable: true }) pdc_cheque_date: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
