import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use a dummy connection string if not provided, to allow app to start without DB
// since the user requested "work without a database"
const connectionString = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
