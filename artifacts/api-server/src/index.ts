import app from "./app";
import { logger } from "./lib/logger";
import { dbClient } from "@workspace/db";

const rawPort = process.env["PORT"] || "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureDatabaseSchema() {
  const productsColumns = await dbClient.execute("PRAGMA table_info(products)");
  const hasExpiryDate = productsColumns.rows.some(
    (row) => row["name"] === "expiry_date",
  );

  if (!hasExpiryDate) {
    await dbClient.execute(
      "ALTER TABLE products ADD COLUMN expiry_date TEXT NOT NULL DEFAULT '2099-12-31'",
    );
    logger.info("Added missing products.expiry_date column");
  }
}

await ensureDatabaseSchema();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
