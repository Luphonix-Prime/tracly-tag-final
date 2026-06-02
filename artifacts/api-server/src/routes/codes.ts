import { Router, type IRouter } from "express";
import { and, eq, desc, inArray, or, sql } from "drizzle-orm";
import {
  db,
  codesTable,
  productsTable,
  batchesTable,
  locationsTable,
  usersTable,
  companiesTable,
  customerScansTable,
} from "@workspace/db";
import { GenerateCodesBody, MapCodeBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";
import { generateUnitCode, generateSsccCode, parseGs1Code } from "../lib/gs1";

const router: IRouter = Router();

// Debug endpoint - shows recent codes in database
router.get("/codes/debug/recent", async (_req, res): Promise<void> => {
  try {
    const codes = await db
      .select({
        id: codesTable.id,
        serialNumber: codesTable.serialNumber,
        ssccCode: codesTable.ssccCode,
        rawString: codesTable.rawString,
        level: codesTable.level,
        createdAt: codesTable.createdAt,
      })
      .from(codesTable)
      .orderBy(desc(codesTable.createdAt))
      .limit(10);
    
    res.json({ 
      total_codes_shown: codes.length,
      codes: codes.map(c => ({
        id: c.id,
        level: c.level,
        serialNumber: c.serialNumber || "null",
        ssccCode: c.ssccCode || "null",
        rawString: c.rawString.substring(0, 50) + (c.rawString.length > 50 ? "..." : ""),
        createdAt: c.createdAt,
      }))
    });
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

const getCityFromZip = (zip: string) => {
  const cleanZip = zip.trim().toLowerCase();
  if (cleanZip.startsWith("400") || cleanZip === "mumbai") return "Mumbai";
  if (cleanZip.startsWith("110") || cleanZip === "delhi" || cleanZip === "new delhi") return "New Delhi";
  if (cleanZip.startsWith("600") || cleanZip === "chennai") return "Chennai";
  if (cleanZip.startsWith("500") || cleanZip === "hyderabad") return "Hyderabad";
  if (cleanZip.startsWith("560") || cleanZip === "bangalore") return "Bengaluru";
  if (cleanZip.startsWith("100") || cleanZip === "ny" || cleanZip === "new york") return "New York";
  if (cleanZip === "singapore" || (cleanZip.length === 6 && !isNaN(Number(cleanZip)))) return "Singapore";
  if (cleanZip === "dubai" || cleanZip.startsWith("dxb")) return "Dubai";
  
  const defaultCities = ["Mumbai", "Singapore", "Dubai", "New Delhi", "Mumbai"];
  let hash = 0;
  for (let i = 0; i < cleanZip.length; i++) {
    hash = cleanZip.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % defaultCities.length;
  return defaultCities[idx] || "Mumbai";
};

const logCustomerScan = async (codeId: number, query: any) => {
  try {
    const customerName = String(query.customerName || "Anonymous Customer");
    const mobileNumber = String(query.mobileNumber || "N/A");
    const zipCode = String(query.zipCode || "N/A");
    const city = getCityFromZip(zipCode);
    
    const now = new Date();
    const scanTime = now.toTimeString().split(" ")[0];
    const day = String(now.getDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const scanDate = `${day} ${month} ${year}`;
    
    await db.insert(customerScansTable).values({
      codeId,
      customerName,
      mobileNumber,
      zipCode,
      city,
      scanTime,
      scanDate,
    });
    console.log(`[Public Verify] Logged customer scan for code ID ${codeId} (${customerName}, ${city})`);
  } catch (err) {
    console.error("Failed to log customer scan:", err);
  }
};

router.get("/codes/public/:serial", async (req, res): Promise<void> => {
  let serial = req.params.serial;
  if (!serial) {
    res.status(400).json({ error: "Serial number is required" });
    return;
  }

  try {
    const aliasUser = usersTable;
    
    // Helper function to build the select query
    const buildQuery = (condition: any) => {
      return db
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
          companyGstin: companiesTable.gstin,
          // Keep public verification resilient even when optional product
          // branding columns are absent in an older deployed database.
          productLogoUrl: sql<string | null>`null`,
          sapDescription: sql<string | null>`null`,
        })
        .from(codesTable)
        .innerJoin(productsTable, eq(codesTable.productId, productsTable.id))
        .leftJoin(batchesTable, eq(codesTable.batchId, batchesTable.id))
        .leftJoin(aliasUser, eq(codesTable.mappedByUserId, aliasUser.id))
        .leftJoin(locationsTable, eq(codesTable.locationId, locationsTable.id))
        .leftJoin(companiesTable, eq(productsTable.companyId, companiesTable.id))
        .where(condition)
        .limit(1);
    };
    
    // Normalize serial: remove common scanner prefixes and trim whitespace
    let searchSerial = serial.trim();
    if (searchSerial.includes("::")) {
      searchSerial = searchSerial.split("::")[1] || searchSerial;
    } else if (searchSerial.includes(":")) {
      const parts = searchSerial.split(":");
      searchSerial = parts[parts.length - 1] || searchSerial;
    }
    
    console.log(`[Public Verify] Searching for: "${serial}" (normalized: "${searchSerial}")`);
    
    // Try direct lookup (serialNumber or ssccCode) FIRST - most common for QR codes
    let rows = await buildQuery(
      or(
        eq(codesTable.serialNumber, searchSerial),
        eq(codesTable.ssccCode, searchSerial)
      )
    );
    
    if (rows.length > 0) {
      console.log(`[Public Verify] Found by serialNumber/ssccCode`);
      await logCustomerScan(rows[0].id, req.query);
      res.json(rows[0]);
      return;
    }

    // Try rawString match SECOND (barcode label scans)
    rows = await buildQuery(eq(codesTable.rawString, searchSerial));
    if (rows.length > 0) {
      console.log(`[Public Verify] Found by rawString (barcode match)`);
      await logCustomerScan(rows[0].id, req.query);
      res.json(rows[0]);
      return;
    }

    // Try parsing as GS1 code and extract serial/SSCC
    const parsed = parseGs1Code(searchSerial);
    if (parsed.serialNumber || parsed.ssccCode) {
      const searchConditions = [];
      if (parsed.serialNumber) {
        searchConditions.push(eq(codesTable.serialNumber, parsed.serialNumber));
        console.log(`[Public Verify] Parsed GS1 serialNumber: "${parsed.serialNumber}"`);
      }
      if (parsed.ssccCode) {
        searchConditions.push(eq(codesTable.ssccCode, parsed.ssccCode));
        console.log(`[Public Verify] Parsed GS1 ssccCode: "${parsed.ssccCode}"`);
      }
      
      if (searchConditions.length > 0) {
        rows = await buildQuery(or(...searchConditions));
        if (rows.length > 0) {
          console.log(`[Public Verify] Found by GS1 parsing`);
          await logCustomerScan(rows[0].id, req.query);
          res.json(rows[0]);
          return;
        }
      }
    }

    // Debug: Check what similar codes exist in database
    console.log(`[Public Verify] NOT FOUND. Checking for similar codes...`);
    const debugCodes = await db
      .select({
        serialNumber: codesTable.serialNumber,
        ssccCode: codesTable.ssccCode,
        rawString: codesTable.rawString,
        level: codesTable.level,
      })
      .from(codesTable)
      .limit(5);
    
    console.log(`[Public Verify] Sample codes in DB:`, JSON.stringify(debugCodes, null, 2));

    res.status(404).json({ 
      error: "Product serial verification code not found or invalid",
      searched: searchSerial,
      hint: "Code does not exist in database. Please verify the code was generated and saved."
    });
  } catch (error: any) {
    console.error("Error fetching public code details:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

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
      companyGstin: companiesTable.gstin,
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

router.get("/codes", requireAuth, async (req, res): Promise<void> => {
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
      companyGstin: companiesTable.gstin,
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

router.post("/codes", requireAuth, async (req, res): Promise<void> => {
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

router.post("/codes/:id/map", requireAuth, async (req, res): Promise<void> => {
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

router.get("/codes/scans", async (req, res): Promise<void> => {
  try {
    const scans = await db
      .select({
        id: customerScansTable.id,
        codeId: customerScansTable.codeId,
        customerName: customerScansTable.customerName,
        mobileNumber: customerScansTable.mobileNumber,
        zipCode: customerScansTable.zipCode,
        city: customerScansTable.city,
        scanTime: customerScansTable.scanTime,
        scanDate: customerScansTable.scanDate,
        createdAt: customerScansTable.createdAt,
        qr: codesTable.serialNumber,
        sscc: codesTable.ssccCode,
        level: codesTable.level,
        productName: productsTable.name,
        batchNumber: batchesTable.batchNumber,
        batchCreatedAt: batchesTable.createdAt,
      })
      .from(customerScansTable)
      .innerJoin(codesTable, eq(customerScansTable.codeId, codesTable.id))
      .innerJoin(productsTable, eq(codesTable.productId, productsTable.id))
      .leftJoin(batchesTable, eq(codesTable.batchId, batchesTable.id))
      .orderBy(desc(customerScansTable.id));

    // Group scans by codeId to get counts and the latest scan
    const groupedMap = new Map<number, any>();
    
    for (const scan of scans) {
      if (!groupedMap.has(scan.codeId)) {
        groupedMap.set(scan.codeId, {
          product: scan.productName,
          batch: scan.batchNumber || "N/A",
          batchDate: scan.batchCreatedAt ? new Date(scan.batchCreatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A",
          qr: scan.qr ? `...${scan.qr.slice(-6)}` : (scan.sscc ? `...${scan.sscc.slice(-6)}` : "N/A"),
          customer: scan.customerName,
          city: scan.city,
          mobile: scan.mobileNumber,
          scanTime: scan.scanTime,
          scanDate: scan.scanDate,
          count: 0,
          type: "normal",
          codeId: scan.codeId,
          level: scan.level,
          events: []
        });
      }
      
      const entry = groupedMap.get(scan.codeId);
      entry.count += 1;
      
      entry.events.push({
        customer: scan.customerName,
        city: scan.city,
        mobile: scan.mobileNumber,
        time: scan.scanTime,
        date: scan.scanDate,
        id: scan.id
      });
    }

    const result = Array.from(groupedMap.values()).map(entry => {
      if (entry.count > 5) {
        entry.type = "anomaly";
      } else if (entry.count > 1) {
        entry.type = "error";
      } else {
        entry.type = "normal";
      }
      return entry;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error fetching scans:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

export default router;

