import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_landlords')
export class Landlord {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) user_id: number;
  @Column() first_name: string;
  @Column({ nullable: true }) middle_name: string;
  @Column({ nullable: true }) last_name: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) registration_date: string;
  @Column({ nullable: true }) country: string;
  @Column({ nullable: true }) id_number: string;
  @Column({ nullable: true }) state: string;
  @Column({ nullable: true }) city: string;
  @Column({ nullable: true }) postal_address: string;
  @Column({ nullable: true }) physical_address: string;
  @Column({ nullable: true }) residential_address: string;
  @Column({ default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
