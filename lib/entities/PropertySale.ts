import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('property_sale')
@Index(["year", "saleDate"])
@Index(["fullAddress"])
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

  @Column({ type: "float8", precision: 10, scale: 2 })
  @Index()
  price!: number;

  @Column({ type: "integer" })
  @Index()
  year!: number;

  @Column({ type: "varchar", default: "" })
  @Index()
  fullAddress!: string;

  @Column({ type: "varchar", nullable: true })
  @Index()
  county!: string | null;

  @Column({ type: "varchar", default: "Second-Hand Dwelling house /Apartment" })
  @Index()
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