import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, locationsTable } from "@workspace/db";
import { CreateLocationBody } from "@workspace/api-zod";
import { requireAuth, requireModule } from '../lib/session.js';

const router: IRouter = Router();

router.use("/locations", requireAuth, requireModule("locations"));

router.get("/locations", async (req, res): Promise<void> => {
  const rows =
    (req.user!.role === "master" || req.user!.role === "super_master")
      ? await db
          .select()
          .from(locationsTable)
          .orderBy(desc(locationsTable.createdAt))
      : req.user!.companyId
        ? await db
            .select()
            .from(locationsTable)
            .where(eq(locationsTable.companyId, req.user!.companyId))
            .orderBy(desc(locationsTable.createdAt))
        : [];
  res.json(rows);
});

router.post("/locations", async (req, res): Promise<void> => {
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let companyId: number | null = null;
  if (req.user!.role === "master" || req.user!.role === "super_master") {
    const rawCid = (parsed.data as any).companyId ?? req.body.companyId;
    companyId = rawCid ? Number(rawCid) : null;
    if (!companyId) {
      res.status(400).json({ error: "Company is required for locations" });
      return;
    }
  } else {
    companyId = req.user!.companyId ?? null;
    if (!companyId) {
      res.status(403).json({ error: "Forbidden: Your account does not have an assigned company" });
      return;
    }
  }

  if (parsed.data.gln) {
    const { validateGs1CheckDigit } = await import('../lib/gs1-validation.js');
    if (!validateGs1CheckDigit(parsed.data.gln)) {
      res.status(400).json({ error: "Invalid GLN checksum. Must be standard 13-digit GS1 location code." });
      return;
    }
  }

  const [row] = await db
    .insert(locationsTable)
    .values({
      companyId,
      locationType: parsed.data.locationType,
      uniqueName: parsed.data.uniqueName,
      locationName: parsed.data.locationName,
      contactNo: parsed.data.contactNo,
      state: parsed.data.state,
      city: parsed.data.city,
      address: parsed.data.address,
      gln: parsed.data.gln ?? null,
    })
    .returning();
  res.status(201).json(row);
});

router.put("/locations/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [targetLocation] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, id));

  if (!targetLocation) {
    res.status(404).json({ error: "Location not found" });
    return;
  }

  if (req.user!.role !== "master" && req.user!.role !== "super_master") {
    if (!req.user!.companyId || targetLocation.companyId !== req.user!.companyId) {
      res.status(403).json({ error: "Forbidden: Cannot edit locations outside your assigned company" });
      return;
    }
  }

  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.gln) {
    const { validateGs1CheckDigit } = await import('../lib/gs1-validation.js');
    if (!validateGs1CheckDigit(parsed.data.gln)) {
      res.status(400).json({ error: "Invalid GLN checksum. Must be standard 13-digit GS1 location code." });
      return;
    }
  }

  const updateFields: any = {
    locationType: parsed.data.locationType,
    uniqueName: parsed.data.uniqueName,
    locationName: parsed.data.locationName,
    contactNo: parsed.data.contactNo,
    state: parsed.data.state,
    city: parsed.data.city,
    address: parsed.data.address,
    gln: parsed.data.gln ?? null,
  };

  if (req.user!.role === "master" || req.user!.role === "super_master") {
    const rawCid = (parsed.data as any).companyId ?? req.body.companyId;
    if (rawCid !== undefined) {
      updateFields.companyId = rawCid ? Number(rawCid) : null;
    }
  }

  const [row] = await db
    .update(locationsTable)
    .set(updateFields)
    .where(eq(locationsTable.id, id))
    .returning();

  res.json(row);
});

router.delete("/locations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [targetLocation] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, id));

  if (!targetLocation) {
    res.status(404).json({ error: "Location not found" });
    return;
  }

  if (req.user!.role !== "master" && req.user!.role !== "super_master") {
    if (!req.user!.companyId || targetLocation.companyId !== req.user!.companyId) {
      res.status(403).json({ error: "Forbidden: Cannot delete locations outside your assigned company" });
      return;
    }
  }

  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.sendStatus(204);
});

export default router;
