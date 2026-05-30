import { db, usersTable, companiesTable } from "@workspace/db";

async function main() {
  console.log("Querying database using Drizzle...");
  
  const users = await db.select().from(usersTable);
  console.log("Users:");
  console.table(users);

  const companies = await db.select().from(companiesTable);
  console.log("Companies:");
  console.table(companies);

  process.exit(0);
}

main().catch(console.error);
