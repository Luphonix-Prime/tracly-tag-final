import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index";
import path from "path";
import fs from "fs";

let dbUrl = process.env.DATABASE_URL;
let dbAuthToken = process.env.DATABASE_AUTH_TOKEN;

if (!dbUrl) {
  // Use local SQLite database file
  let resolvedDirname = "";
  try {
    resolvedDirname = import.meta.dirname || __dirname;
  } catch (e) {
    resolvedDirname = ".";
  }

  const dbFile = path.resolve(resolvedDirname, "..", "traclytag.db");
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === "production";

  if (isVercel) {
    // Vercel serverless functions have a read-only filesystem, except for /tmp
    const tmpDbFile = path.resolve("/tmp", "traclytag.db");

    // Copy the committed database file to /tmp if it doesn't exist yet
    if (!fs.existsSync(tmpDbFile)) {
      try {
        if (fs.existsSync(dbFile)) {
          fs.copyFileSync(dbFile, tmpDbFile);
        } else {
          // If the template db file wasn't found in the package path, search in other common paths
          const fallbackPaths = [
            path.resolve(process.cwd(), "lib/db/traclytag.db"),
            path.resolve(process.cwd(), "traclytag.db"),
            path.resolve(process.cwd(), "../lib/db/traclytag.db"),
            path.resolve(resolvedDirname, "../../lib/db/traclytag.db"),
            path.resolve(resolvedDirname, "../lib/db/traclytag.db"),
          ];
          let copied = false;
          for (const fallbackPath of fallbackPaths) {
            if (fs.existsSync(fallbackPath)) {
              fs.copyFileSync(fallbackPath, tmpDbFile);
              copied = true;
              break;
            }
          }
          if (!copied) {
            // Create an empty database file if no template exists
            fs.writeFileSync(tmpDbFile, "");
          }
        }
      } catch (e) {
        console.error("Failed to copy SQLite database to /tmp:", e);
      }
    }
    dbUrl = `file:${tmpDbFile}`;
  } else {
    dbUrl = `file:${dbFile}`;
  }
}

const client = createClient({ 
  url: dbUrl,
  authToken: dbAuthToken
});

export const db = drizzle(client, { schema });

export * from "./schema";
