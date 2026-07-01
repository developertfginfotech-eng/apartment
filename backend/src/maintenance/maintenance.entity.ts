import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) property_id: number;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) title: string;
  @Column({ nullable: true }) amount: string;
  @Column({ nullable: true }) date: string;
  @Column({ nullable: true }) month: string;
  @Column({ nullable: true }) year: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
