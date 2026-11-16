import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

let _db: NeonDatabase<typeof schema> | null = null;

/** Lazily created so builds without DATABASE_URL still work. */
export function db(): NeonDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = drizzle({ client: new Pool({ connectionString: url }), schema });
  }
  return _db;
}

export * from "./schema";
