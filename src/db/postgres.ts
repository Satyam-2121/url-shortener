import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// An idle connection can fail outside the scope of any request.
pool.on("error", (error) => {
  console.error("PostgreSQL idle connection error:", error.message);
});
