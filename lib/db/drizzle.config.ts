import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";

let resolvedDirname = "";
try {
  resolvedDirname = import.meta.dirname || __dirname;
} catch (e) {
  resolvedDirname = ".";
}

dotenv.config({ path: path.resolve(resolvedDirname, "../../.env") });
dotenv.config({ path: path.resolve(resolvedDirname, "../.env") });
dotenv.config();

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./traclytag.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
