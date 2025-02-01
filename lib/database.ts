import "reflect-metadata";
import { DataSource } from "typeorm";
import { PropertySale } from "./entities/PropertySale";

let initialized = false;
let dataSource: DataSource;

export const getDataSource = async () => {
  if (!initialized) {
    const isProduction = process.env.NODE_ENV === "production";
    console.log('Database config:', {
      host: process.env.POSTGRES_HOST,
      port: 5432,
      username: process.env.POSTGRES_USER,
      database: process.env.POSTGRES_DATABASE,
      ssl: isProduction
    });
    
    try {
      dataSource = new DataSource({
        type: "postgres",
        host: process.env.POSTGRES_HOST,
        port: 5432,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE,
        synchronize: false,
        logging: true,
        entities: [PropertySale],
        subscribers: [],
        migrations: [],
        ssl: isProduction ? {
          rejectUnauthorized: false
        } : false,
      });

      await dataSource.initialize();
      console.log("✅ Database connected successfully");
      initialized = true;
    } catch (error) {
      console.error("❌ Database connection error:", error);
      throw error;
    }
  }

  return dataSource;
}; 