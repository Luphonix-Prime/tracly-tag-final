import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { CreateCompanyBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/session";

const router: IRouter = Router();

router.use("/companies", requireAuth);

router.get("/companies", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(companiesTable)
    .orderBy(desc(companiesTable.createdAt));
  res.json(rows);
});

router.post(
  "/companies",
  requireRole("master"),
  async (req, res): Promise<void> => {
    const parsed = CreateCompanyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .insert(companiesTable)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        address: parsed.data.address,
        gstin: parsed.data.gstin ?? null,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.delete(
  "/companies/:id",
  requireRole("master"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw ?? "", 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    res.sendStatus(204);
  },
);

export default router;
