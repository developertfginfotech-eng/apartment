import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_renters')
export class Renter {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) property_id: number;
  @Column({ nullable: true }) floor_id: number;
  @Column({ nullable: true }) unit_id: number;
  @Column({ nullable: true }) name: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) password: string;
  @Column({ nullable: true }) contact: string;
  @Column({ nullable: true }) national_id: string;
  @Column({ nullable: true }) advance_rent: string;
  @Column({ nullable: true }) rent_per_month: string;
  @Column({ nullable: true }) issue_date: string;
  @Column({ nullable: true }) rent_month: string;
  @Column({ nullable: true }) rent_year: string;
  @Column({ type: 'text', nullable: true }) address: string;
  @Column({ default: 1 }) renter_status: number;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
