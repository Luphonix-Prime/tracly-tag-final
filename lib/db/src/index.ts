import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index";
import path from "path";

const dbFile = path.resolve(import.meta.dirname, "..", "traclytag.db");
const dbUrl = process.env.DATABASE_URL || `file:${dbFile}`;
const dbAuthToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ 
  url: dbUrl,
  authToken: dbAuthToken
});

export const db = drizzle(client, { schema });

export * from "./schema";
