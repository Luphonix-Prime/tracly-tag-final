import { Router, type IRouter } from "express";
import { eq, desc, or } from "drizzle-orm";
import { db, companiesTable, usersTable } from "@workspace/db";
import { CreateCompanyBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from '../lib/session.js';

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
  let companyId = req.user?.companyId;
  if (!companyId && req.user?.role === "super_master") {
    companyId = Number(req.query.companyId) || 1;
  }
  if (!companyId) {
    res.status(404).json({ error: "No company associated with this account" });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId));
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(company);
});

router.put("/companies/my-company", async (req, res): Promise<void> => {
  let companyId = req.user?.companyId;
  if (!companyId && req.user?.role === "super_master") {
    companyId = Number(req.body.companyId || req.query.companyId) || 1;
  }
  if (!companyId) {
    res.status(404).json({ error: "No company associated with this account" });
    return;
  }
  const { gstin, companyUrl, pan, cin, msmeRegistrationNo, fssaiLicenseNo, drugLicenseNo, iecCode, companyPrefix } = req.body;
  const [updated] = await db
    .update(companiesTable)
    .set({
      gstin: gstin !== undefined ? (gstin || null) : undefined,
      companyUrl: companyUrl !== undefined ? (companyUrl || null) : undefined,
      pan: pan !== undefined ? (pan || null) : undefined,
      cin: cin !== undefined ? (cin || null) : undefined,
      msmeRegistrationNo: msmeRegistrationNo !== undefined ? (msmeRegistrationNo || null) : undefined,
      fssaiLicenseNo: fssaiLicenseNo !== undefined ? (fssaiLicenseNo || null) : undefined,
      drugLicenseNo: drugLicenseNo !== undefined ? (drugLicenseNo || null) : undefined,
      iecCode: iecCode !== undefined ? (iecCode || null) : undefined,
      companyPrefix: companyPrefix !== undefined ? (companyPrefix || null) : undefined,
    })
    .where(eq(companiesTable.id, companyId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(updated);
});

router.post("/companies/my-company/regenerate-api-key", async (req, res): Promise<void> => {
  let companyId = req.user?.companyId;
  if (!companyId && req.user?.role === "super_master") {
    companyId = Number(req.body.companyId || req.query.companyId) || 1;
  }
  if (!companyId) {
    res.status(404).json({ error: "No company associated with this account" });
    return;
  }
  const newApiKey = `tt_live_${crypto.randomBytes(32).toString("hex")}`;
  const [updated] = await db
    .update(companiesTable)
    .set({ apiKey: newApiKey })
    .where(eq(companiesTable.id, companyId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(updated);
});

router.get("/companies", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(companiesTable)
    .orderBy(desc(companiesTable.createdAt));

  const filtered =
    (req.user!.role === "master" || req.user!.role === "super_master")
      ? rows
      : rows.filter((c) => c.id === req.user!.companyId);

  res.json(filtered);
});

router.post(
  "/companies",
  requireRole("master", "super_master", "admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateCompanyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!parsed.data.gstin || !parsed.data.gstin.trim()) {
      res.status(400).json({ error: "GSTIN is required" });
      return;
    }

    // Check for duplicate company by name, email, or gstin
    const existingCompany = await db
      .select({ id: companiesTable.id, name: companiesTable.name, email: companiesTable.email, gstin: companiesTable.gstin })
      .from(companiesTable)
      .where(
        or(
          eq(companiesTable.name, parsed.data.name.trim()),
          eq(companiesTable.email, parsed.data.email.trim()),
          eq(companiesTable.gstin, parsed.data.gstin.trim())
        )
      )
      .limit(1);

    if (existingCompany.length > 0) {
      const match = existingCompany[0];
      if (match.name.toLowerCase() === parsed.data.name.trim().toLowerCase()) {
        res.status(409).json({ error: `A company with name '${parsed.data.name}' already exists.` });
        return;
      }
      if (match.email.toLowerCase() === parsed.data.email.trim().toLowerCase()) {
        res.status(409).json({ error: `A company with email '${parsed.data.email}' already exists.` });
        return;
      }
      if (match.gstin && match.gstin.toUpperCase() === parsed.data.gstin.trim().toUpperCase()) {
        res.status(409).json({ error: `A company with GSTIN '${parsed.data.gstin}' already exists.` });
        return;
      }
    }
    const [row] = await db
      .insert(companiesTable)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        address: parsed.data.address,
        gstin: parsed.data.gstin ?? null,
        companyUrl: parsed.data.companyUrl ?? null,
        pan: parsed.data.pan ?? null,
        cin: parsed.data.cin ?? null,
        msmeRegistrationNo: parsed.data.msmeRegistrationNo ?? null,
        fssaiLicenseNo: parsed.data.fssaiLicenseNo ?? null,
        drugLicenseNo: parsed.data.drugLicenseNo ?? null,
        iecCode: parsed.data.iecCode ?? null,
        companyPrefix: parsed.data.companyPrefix ?? null,
      })
      .returning();

    // If an admin creates a company and currently has no companyId, assign it to them
    if (req.user!.role === "admin" && !req.user!.companyId) {
      await db.update(usersTable).set({ companyId: row.id }).where(eq(usersTable.id, req.user!.id));
      req.user!.companyId = row.id;
    }

    res.status(201).json(row);
  },
);

router.put(
  "/companies/:id",
  requireRole("master", "super_master", "admin"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw ?? "", 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (req.user!.role !== "master" && req.user!.role !== "super_master") {
      if (id !== req.user!.companyId) {
        res.status(403).json({ error: "Forbidden: Cannot edit companies outside your assigned company" });
        return;
      }
    }
    const parsed = CreateCompanyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [updated] = await db
      .update(companiesTable)
      .set({
        name: parsed.data.name,
        email: parsed.data.email,
        address: parsed.data.address,
        gstin: parsed.data.gstin !== undefined ? (parsed.data.gstin || null) : undefined,
        companyUrl: parsed.data.companyUrl !== undefined ? (parsed.data.companyUrl || null) : undefined,
        pan: parsed.data.pan !== undefined ? (parsed.data.pan || null) : undefined,
        cin: parsed.data.cin !== undefined ? (parsed.data.cin || null) : undefined,
        msmeRegistrationNo: parsed.data.msmeRegistrationNo !== undefined ? (parsed.data.msmeRegistrationNo || null) : undefined,
        fssaiLicenseNo: parsed.data.fssaiLicenseNo !== undefined ? (parsed.data.fssaiLicenseNo || null) : undefined,
        drugLicenseNo: parsed.data.drugLicenseNo !== undefined ? (parsed.data.drugLicenseNo || null) : undefined,
        iecCode: parsed.data.iecCode !== undefined ? (parsed.data.iecCode || null) : undefined,
        companyPrefix: parsed.data.companyPrefix !== undefined ? (parsed.data.companyPrefix || null) : undefined,
      })
      .where(eq(companiesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/companies/:id",
  requireRole("master", "super_master", "admin"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw ?? "", 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (req.user!.role !== "master" && req.user!.role !== "super_master") {
      if (id !== req.user!.companyId) {
        res.status(403).json({ error: "Forbidden: Cannot delete companies outside your assigned company" });
        return;
      }
    }
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    res.sendStatus(204);
  },
);

export default router;

