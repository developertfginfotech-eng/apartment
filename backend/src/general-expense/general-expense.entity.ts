import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_general_expenses')
export class GeneralExpense {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column({ nullable: true }) name: string;
  @Column({ nullable: true }) display_name: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ default: 1 }) status: number;
  @Column({ nullable: true }) parent_id: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
