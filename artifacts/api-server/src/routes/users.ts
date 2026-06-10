import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, companiesTable } from "@workspace/db";
import { CreateUserBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

router.use("/users", requireAuth);

router.get("/users", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      companyId: usersTable.companyId,
      companyName: companiesTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(companiesTable, eq(usersTable.companyId, companiesTable.id))
    .orderBy(desc(usersTable.createdAt));

  // Scope: non-master sees only own company
  const filtered =
    req.user!.role === "master"
      ? rows
      : rows.filter((r) => r.companyId === req.user!.companyId);
  res.json(filtered);
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let companyId = parsed.data.companyId ?? null;
  if (req.user!.role !== "master") {
    // Force company scope for non-masters
    companyId = req.user!.companyId;
    if (parsed.data.role === "master") {
      res.status(403).json({ error: "Cannot create master users" });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const [row] = await db
      .insert(usersTable)
      .values({
        username: parsed.data.username,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        passwordHash,
        role: parsed.data.role,
        companyId,
      })
      .returning();

    let companyName: string | null = null;
    if (row!.companyId) {
      const [c] = await db
        .select({ name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, row!.companyId));
      companyName = c?.name ?? null;
    }

    res.status(201).json({
      id: row!.id,
      username: row!.username,
      email: row!.email,
      phone: row!.phone,
      role: row!.role,
      companyId: row!.companyId,
      companyName,
      createdAt: row!.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create user");
    res.status(400).json({ error: "Username may already exist" });
  }
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (id === req.user!.id) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

router.put("/users/profile", async (req, res): Promise<void> => {
  const { email, phone, password } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const updateData: any = {
      email,
      phone: phone ?? null,
    };

    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters long" });
        return;
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const [updatedUser] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.user!.id))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      companyId: updatedUser.companyId,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

export default router;
