import { db, usersTable } from "@workspace/db";

async function main() {
  console.log("Fetching users from Turso...");
  const users = await db.select().from(usersTable);
  console.log("Users found:", JSON.stringify(users, null, 2));
}

main().catch(err => {
  console.error("Error:", err);
});
