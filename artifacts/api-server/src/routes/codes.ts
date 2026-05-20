import { Router, type IRouter } from "express";
import { and, eq, desc, inArray, or } from "drizzle-orm";
import {
  db,
  codesTable,
  productsTable,
  batchesTable,
  locationsTable,
  usersTable,
  companiesTable,
} from "@workspace/db";
import { GenerateCodesBody, MapCodeBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";
import { generateUnitCode, generateSsccCode } from "../lib/gs1";

const router: IRouter = Router();

router.get("/codes/public/:serial", async (req, res): Promise<void> => {
  const serial = req.params.serial;
  if (!serial) {
    res.status(400).json({ error: "Serial number is required" });
    return;
  }

  try {
    const aliasUser = usersTable;
    const rows = await db
      .select({
        id: codesTable.id,
        productId: codesTable.productId,
        productName: productsTable.name,
        batchId: codesTable.batchId,
        batchNumber: batchesTable.batchNumber,
        level: codesTable.level,
        rawString: codesTable.rawString,
        serialNumber: codesTable.serialNumber,
        ssccCode: codesTable.ssccCode,
        mapped: codesTable.mapped,
        mappedAt: codesTable.mappedAt,
        mappedByUserId: codesTable.mappedByUserId,
        mappedByUsername: aliasUser.username,
        locationId: codesTable.locationId,
        locationName: locationsTable.locationName,
        createdAt: codesTable.createdAt,
        mfgDate: batchesTable.mfgDate,
        expiryDate: batchesTable.expiryDate,
        marketedBy: productsTable.marketedBy,
        registrationNo: productsTable.registrationNo,
        companyName: companiesTable.name,
        companyAddress: companiesTable.address,
      })
      .from(codesTable)
      .innerJoin(productsTable, eq(codesTable.productId, productsTable.id))
      .leftJoin(batchesTable, eq(codesTable.batchId, batchesTable.id))
      .leftJoin(aliasUser, eq(codesTable.mappedByUserId, aliasUser.id))
      .leftJoin(locationsTable, eq(codesTable.locationId, locationsTable.id))
      .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
      .where(
        or(
          eq(codesTable.serialNumber, serial),
          eq(codesTable.ssccCode, serial)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Product serial verification code not found or invalid" });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error("Error fetching public code details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.use(requireAuth);

const aliasUser = usersTable;

async function fetchEnrichedCodes(ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: codesTable.id,
      productId: codesTable.productId,
      productName: productsTable.name,
      batchId: codesTable.batchId,
      batchNumber: batchesTable.batchNumber,
      level: codesTable.level,
      rawString: codesTable.rawString,
      serialNumber: codesTable.serialNumber,
      ssccCode: codesTable.ssccCode,
      mapped: codesTable.mapped,
      mappedAt: codesTable.mappedAt,
      mappedByUserId: codesTable.mappedByUserId,
      mappedByUsername: aliasUser.username,
      locationId: codesTable.locationId,
      locationName: locationsTable.locationName,
      createdAt: codesTable.createdAt,
      mfgDate: batchesTable.mfgDate,
      expiryDate: batchesTable.expiryDate,
      marketedBy: productsTable.marketedBy,
      registrationNo: productsTable.registrationNo,
      companyName: companiesTable.name,
      companyAddress: companiesTable.address,
    })
    .from(codesTable)
    .innerJoin(productsTable, eq(codesTable.productId, productsTable.id))
    .leftJoin(batchesTable, eq(codesTable.batchId, batchesTable.id))
    .leftJoin(aliasUser, eq(codesTable.mappedByUserId, aliasUser.id))
    .leftJoin(locationsTable, eq(codesTable.locationId, locationsTable.id))
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(
      ids.length === 1
        ? eq(codesTable.id, ids[0]!)
        : inArray(codesTable.id, ids),
    )
    .orderBy(desc(codesTable.createdAt));
  return rows;
}

router.get("/codes", async (req, res): Promise<void> => {
  const level = typeof req.query.level === "string" ? req.query.level : null;
  const batchId =
    typeof req.query.batchId === "string"
      ? parseInt(req.query.batchId, 10)
      : null;
  const productId =
    typeof req.query.productId === "string"
      ? parseInt(req.query.productId, 10)
      : null;
  const limit =
    typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 100;

  const conds = [];
  if (level) conds.push(eq(codesTable.level, level));
  if (batchId && !Number.isNaN(batchId))
    conds.push(eq(codesTable.batchId, batchId));
  if (productId && !Number.isNaN(productId))
    conds.push(eq(codesTable.productId, productId));
  if (req.user!.role !== "master") {
    conds.push(eq(productsTable.companyId, req.user!.companyId!));
  }
  const where =
    conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds);

  const rows = await db
    .select({
      id: codesTable.id,
      productId: codesTable.productId,
      productName: productsTable.name,
      batchId: codesTable.batchId,
      batchNumber: batchesTable.batchNumber,
      level: codesTable.level,
      rawString: codesTable.rawString,
      serialNumber: codesTable.serialNumber,
      ssccCode: codesTable.ssccCode,
      mapped: codesTable.mapped,
      mappedAt: codesTable.mappedAt,
      mappedByUserId: codesTable.mappedByUserId,
      mappedByUsername: aliasUser.username,
      locationId: codesTable.locationId,
      locationName: locationsTable.locationName,
      createdAt: codesTable.createdAt,
      mfgDate: batchesTable.mfgDate,
      expiryDate: batchesTable.expiryDate,
      marketedBy: productsTable.marketedBy,
      registrationNo: productsTable.registrationNo,
      companyName: companiesTable.name,
      companyAddress: companiesTable.address,
    })
    .from(codesTable)
    .innerJoin(productsTable, eq(codesTable.productId, productsTable.id))
    .leftJoin(batchesTable, eq(codesTable.batchId, batchesTable.id))
    .leftJoin(aliasUser, eq(codesTable.mappedByUserId, aliasUser.id))
    .leftJoin(locationsTable, eq(codesTable.locationId, locationsTable.id))
    .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
    .where(where)
    .orderBy(desc(codesTable.createdAt))
    .limit(Math.min(Math.max(limit, 1), 5000));

  res.json(rows);
});

router.post("/codes", async (req, res): Promise<void> => {
  const parsed = GenerateCodesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [batch] = await db
    .select({
      id: batchesTable.id,
      productId: batchesTable.productId,
      batchNumber: batchesTable.batchNumber,
      expiryDate: batchesTable.expiryDate,
      gtin: productsTable.gtin,
      companyId: productsTable.companyId,
    })
    .from(batchesTable)
    .innerJoin(productsTable, eq(batchesTable.productId, productsTable.id))
    .where(eq(batchesTable.id, parsed.data.batchId));

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  if (
    req.user!.role !== "master" &&
    batch.companyId !== req.user!.companyId
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const isUnitLevel = ["unit", "l1", "l2"].includes(parsed.data.level);

  const inserts = [];
  for (let i = 0; i < parsed.data.quantity; i++) {
    if (isUnitLevel) {
      const { raw, serial } = generateUnitCode({
        gtin: batch.gtin,
        expiry: batch.expiryDate,
        batch: batch.batchNumber,
      });
      inserts.push({
        productId: batch.productId,
        batchId: batch.id,
        level: parsed.data.level,
        rawString: raw,
        serialNumber: serial,
        ssccCode: null,
      });
    } else {
      const { raw, sscc } = generateSsccCode(batch.gtin.slice(1, 8), i);
      inserts.push({
        productId: batch.productId,
        batchId: batch.id,
        level: parsed.data.level,
        rawString: raw,
        serialNumber: null,
        ssccCode: sscc,
      });
    }
  }

  const inserted = await db.insert(codesTable).values(inserts).returning();
  const ids = inserted.map((r) => r.id);
  const rows = await fetchEnrichedCodes(ids);
  res.status(201).json({ generated: inserted.length, codes: rows });
});

router.post("/codes/:id/map", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = MapCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(codesTable)
    .set({
      mapped: true,
      mappedAt: new Date().toISOString(),
      mappedByUserId: req.user!.id,
      locationId: parsed.data.locationId,
    })
    .where(eq(codesTable.id, id));

  const [row] = await fetchEnrichedCodes([id]);
  if (!row) {
    res.status(404).json({ error: "Code not found" });
    return;
  }
  res.json(row);
});

export default router;
