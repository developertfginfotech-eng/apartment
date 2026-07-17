import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('tbl_settings')
export class Setting {
  @PrimaryColumn({ default: 1 }) id: number;
  @Column({ nullable: true }) company_name: string;
  @Column({ nullable: true }) logo: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) currency: string;
  @Column({ nullable: true }) physical_address: string;
  @Column({ nullable: true }) postal_address: string;
  @UpdateDateColumn() updated_at: Date;
}
