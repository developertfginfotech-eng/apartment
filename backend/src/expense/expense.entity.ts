import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_expenses')
export class Expense {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) property_id: number;
  @Column({ nullable: true }) floor_id: string;
  @Column({ nullable: true }) unit_id: string;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) sub_category: string;
  @Column({ nullable: true }) title: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) amount: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) tax: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) famount: string;
  @Column({ nullable: true }) date: string;
  @Column({ nullable: true }) month: string;
  @Column({ nullable: true }) year: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
