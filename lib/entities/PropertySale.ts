import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class PropertySale {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "timestamp" })
  @Index()
  saleDate!: Date;

  @Column({ type: "varchar" })
  @Index()
  address!: string;

  @Column({ type: "varchar", nullable: true })
  @Index()
  eircode!: string | null;

  @Column({ type: "float8" })
  @Index()
  price!: number;

  @Column({ type: "integer" })
  @Index()
  year!: number;

  @Column({ type: "varchar", default: "" })
  fullAddress!: string;

  @Column({ type: "varchar", nullable: true })
  county!: string | null;

  @Column({ type: "varchar", default: "Second-Hand Dwelling house /Apartment" })
  description!: string;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;

  constructor() {
    this.fullAddress = "";
    this.eircode = null;
    this.county = null;
  }
} 