import "reflect-metadata";
import { DataSource } from "typeorm";
import { PropertySale } from "./entities/PropertySale";

let initialized = false;
let dataSource: DataSource;

export const getDataSource = async () => {
  if (!initialized) {
    dataSource = new DataSource({
      type: "postgres",
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "postgres",
      database: process.env.POSTGRES_DATABASE || "property_sales",
      synchronize: true,
      logging: process.env.NODE_ENV === "development",
      entities: [PropertySale],
      subscribers: [],
      migrations: [],
      ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false
      } : false
    });

    await dataSource.initialize();
    initialized = true;
  }

  return dataSource;
}; 