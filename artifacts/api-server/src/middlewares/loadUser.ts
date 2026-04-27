import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export const loadUser: RequestHandler = async (req, _res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    next();
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (user) {
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as "master" | "client_admin" | "operator",
      companyId: user.companyId,
    };
  }
  next();
};
