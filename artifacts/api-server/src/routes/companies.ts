import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { CreateCompanyBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/session";

const router: IRouter = Router();

router.get("/companies/public/by-domain", async (req, res): Promise<void> => {
  const domain = req.query.domain as string;
  if (!domain) {
    res.status(400).json({ error: "Domain parameter is required" });
    return;
  }
  const [company] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      companyUrl: companiesTable.companyUrl,
    })
    .from(companiesTable)
    .where(eq(companiesTable.companyUrl, domain));

  if (!company) {
    res.status(404).json({ error: "Company not found for this domain" });
    return;
  }
  res.json(company);
});

router.use("/companies", requireAuth);

import crypto from "crypto";

router.get("/companies/my-company", async (req, res): Promise<void> => {
  if (!req.user || !req.user.companyId) {
    res.status(404).json({ error: "No company associated with this account" });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, req.user.companyId));
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(company);
});

router.put("/companies/my-company", async (req, res): Promise<void> => {
  if (!req.user || !req.user.companyId) {
    res.status(404).json({ error: "No company associated with this account" });
    return;
  }
  const { companyUrl } = req.body;
  const [updated] = await db
    .update(companiesTable)
    .set({ companyUrl: companyUrl || null })
    .where(eq(companiesTable.id, req.user.companyId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(updated);
});

router.post("/companies/my-company/regenerate-api-key", async (req, res): Promise<void> => {
  if (!req.user || !req.user.companyId) {
    res.status(404).json({ error: "No company associated with this account" });
    return;
  }
  const newApiKey = `tt_live_${crypto.randomBytes(32).toString("hex")}`;
  const [updated] = await db
    .update(companiesTable)
    .set({ apiKey: newApiKey })
    .where(eq(companiesTable.id, req.user.companyId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(updated);
});

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
        companyUrl: parsed.data.companyUrl ?? null,
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
