import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import path from "path";

const dbUrl = `file:${path.resolve(process.cwd(), "traclytag.db")}`;

const client = createClient({ url: dbUrl });

export const db = drizzle(client, { schema });
export const dbClient = client;

export * from "./schema";
