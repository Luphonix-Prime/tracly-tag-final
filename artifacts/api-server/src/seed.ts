import bcrypt from "bcryptjs";
import {
  db,
  companiesTable,
  usersTable,
  productsTable,
  locationsTable,
  batchesTable,
  codesTable,
} from "@workspace/db";
import { generateUnitCode, generateSsccCode } from "./lib/gs1";

async function main() {
  console.log("Seeding TraclyTag database…");

  const existing = await db.select().from(usersTable);
  if (existing.length > 0) {
    console.log(`Already seeded (${existing.length} users). Skipping.`);
    process.exit(0);
  }

  // Company
  const [demoCo] = await db
    .insert(companiesTable)
    .values({
      name: "Demo Pharma Pvt Ltd",
      email: "ops@demopharma.in",
      address: "Plot 14, MIDC Industrial Area, Pune, Maharashtra 411019",
      gstin: "27AABCD1234E1Z5",
    })
    .returning();
  console.log("Company:", demoCo!.name);

  // Users
  const supermasterUsername = process.env.SUPERMASTER_USERNAME || "supermaster";
  const supermasterPassword = process.env.SUPERMASTER_PASSWORD || "super123";
  const superMasterHash = await bcrypt.hash(supermasterPassword, 10);
  const masterHash = await bcrypt.hash("master123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const opHash = await bcrypt.hash("op123", 10);

  await db.insert(usersTable).values([
    {
      username: supermasterUsername,
      email: process.env.SUPERMASTER_EMAIL || "supermaster@tracelytag.com",
      phone: "+91 8000000000",
      passwordHash: superMasterHash,
      role: "super_master",
      companyId: null,
    },
    {
      username: "master",
      email: "master@tracelytag.com",
      phone: "+91 9000000000",
      passwordHash: masterHash,
      role: "master",
      companyId: null,
    },
    {
      username: "demo_admin",
      email: "admin@demopharma.in",
      phone: "+91 9111111111",
      passwordHash: adminHash,
      role: "client_admin",
      companyId: demoCo!.id,
    },
    {
      username: "demo_op",
      email: "op@demopharma.in",
      phone: "+91 9222222222",
      passwordHash: opHash,
      role: "operator",
      companyId: demoCo!.id,
    },
  ]);
  console.log(`Users: ${supermasterUsername}, master, demo_admin, demo_op`);

  // Locations
  const [warehouse] = await db
    .insert(locationsTable)
    .values([
      {
        companyId: demoCo!.id,
        locationType: "Warehouse",
        uniqueName: "WH-PUNE-01",
        locationName: "Pune Central Warehouse",
        contactNo: "+91 2027451234",
        state: "Maharashtra",
        city: "Pune",
        address: "Plot 14, MIDC Industrial Area, Pune 411019",
      },
      {
        companyId: demoCo!.id,
        locationType: "Distributor",
        uniqueName: "DST-MUM-04",
        locationName: "Mumbai Distributor Hub",
        contactNo: "+91 2261234500",
        state: "Maharashtra",
        city: "Mumbai",
        address: "Andheri East, Mumbai 400069",
      },
      {
        companyId: demoCo!.id,
        locationType: "Retailer",
        uniqueName: "RTL-DEL-12",
        locationName: "Connaught Place Pharmacy",
        contactNo: "+91 1141234567",
        state: "Delhi",
        city: "New Delhi",
        address: "Block A, Connaught Place, New Delhi 110001",
      },
    ])
    .returning();
  console.log("Locations seeded");

  // Products (use real-format GTINs - check digit pre-calculated)
  // GTIN-14: 08901234567896 (cd 6); 08907654321094 (cd 4)
  const [paracet, vitaminC] = await db
    .insert(productsTable)
    .values([
      {
        companyId: demoCo!.id,
        skuId: "PARA-500-10S",
        name: "Paracetamol 500mg",
        skuSize: "10x10 Tablets",
        marketedBy: "Demo Pharma Pvt Ltd",
        sapDescription: "PARACETAMOL TABLETS IP 500MG",
        gtin: "08901234567896",
        mrp: 45.00,
        registrationNo: "MH/DRUGS/2023/0451",
        l1Size: 10,
        l2Size: 100,
        shipperSize: 1000,
        cautionLogoUrl: null,
        productLogoUrl: null,
        labelPdfUrl: null,
        expiryDate: "2028-04-30",
      },
      {
        companyId: demoCo!.id,
        skuId: "VITC-1000-30S",
        name: "Vitamin C 1000mg Effervescent",
        skuSize: "30 Tablets Tube",
        marketedBy: "Demo Pharma Pvt Ltd",
        sapDescription: "ASCORBIC ACID 1000MG EFFERVESCENT",
        gtin: "08907654321094",
        mrp: 299.00,
        registrationNo: "MH/DRUGS/2023/0892",
        l1Size: 6,
        l2Size: 36,
        shipperSize: 216,
        cautionLogoUrl: null,
        productLogoUrl: null,
        labelPdfUrl: null,
        expiryDate: "2027-12-31",
      },
    ])
    .returning();
  console.log("Products: Paracetamol, Vitamin C");

  // Batches
  const [batchA, batchB] = await db
    .insert(batchesTable)
    .values([
      {
        productId: paracet!.id,
        batchNumber: "PCM2604A",
        mfgDate: "2026-04-01",
        expiryDate: "2028-04-30",
      },
      {
        productId: vitaminC!.id,
        batchNumber: "VTC2604B",
        mfgDate: "2026-04-15",
        expiryDate: "2027-12-31",
      },
    ])
    .returning();
  console.log("Batches seeded");

  // Sample codes — 30 unit codes for Paracet, 20 for VitC, 5 shippers, 2 pallets
  const codeRows: Array<{
    productId: number;
    batchId: number | null;
    level: string;
    rawString: string;
    serialNumber: string | null;
    ssccCode: string | null;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const { raw, serial } = generateUnitCode({
      gtin: paracet!.gtin!,
      expiry: paracet!.expiryDate,
      batch: batchA!.batchNumber,
    });
    codeRows.push({
      productId: paracet!.id,
      batchId: batchA!.id,
      level: "unit",
      rawString: raw,
      serialNumber: serial,
      ssccCode: null,
    });
  }
  for (let i = 0; i < 20; i++) {
    const { raw, serial } = generateUnitCode({
      gtin: vitaminC!.gtin!,
      expiry: vitaminC!.expiryDate,
      batch: batchB!.batchNumber,
    });
    codeRows.push({
      productId: vitaminC!.id,
      batchId: batchB!.id,
      level: "unit",
      rawString: raw,
      serialNumber: serial,
      ssccCode: null,
    });
  }
  for (let i = 0; i < 5; i++) {
    const { raw, sscc } = generateSsccCode("8901234", i);
    codeRows.push({
      productId: paracet!.id,
      batchId: batchA!.id,
      level: "shipper",
      rawString: raw,
      serialNumber: null,
      ssccCode: sscc,
    });
  }
  for (let i = 0; i < 2; i++) {
    const { raw, sscc } = generateSsccCode("8901234", 100 + i);
    codeRows.push({
      productId: paracet!.id,
      batchId: batchA!.id,
      level: "pallet",
      rawString: raw,
      serialNumber: null,
      ssccCode: sscc,
    });
  }

  const insertedCodes = await db.insert(codesTable).values(codeRows).returning();
  console.log(`Codes: ${insertedCodes.length} generated`);

  // Map a few codes to warehouse
  const toMap = insertedCodes.slice(0, 12);
  for (const c of toMap) {
    await db
      .update(codesTable)
      .set({
        mapped: true,
        mappedAt: new Date().toISOString(),
        mappedByUserId: 3, // demo_op
        locationId: warehouse!.id,
      })
      .where((await import("drizzle-orm")).eq(codesTable.id, c.id));
  }
  console.log(`Mapped ${toMap.length} codes to warehouse`);

  // Seeding Customer Scans
  const { customerScansTable } = await import("@workspace/db");
  const customerScans = [
    // Code 1: normal scan
    {
      codeId: insertedCodes[0]!.id,
      customerName: "Aravind Sharma",
      mobileNumber: "+91 98765 00121",
      zipCode: "400001",
      city: "Mumbai",
      scanTime: "14:22:10",
      scanDate: "15 Jun 2024",
    },
    // Code 2: anomaly (multiple scans by same/different customers)
    ...Array.from({ length: 12 }).map((_, idx) => ({
      codeId: insertedCodes[1]!.id,
      customerName: "Michael Chang",
      mobileNumber: "+65 8299 1192",
      zipCode: "039794",
      city: "Singapore",
      scanTime: `13:${10 + idx}:45`,
      scanDate: "15 Jun 2024",
    })),
    // Code 3: normal scan
    {
      codeId: insertedCodes[2]!.id,
      customerName: "Elena Petrova",
      mobileNumber: "+971 50 123 441",
      zipCode: "DXB-992",
      city: "Dubai",
      scanTime: "11:40:02",
      scanDate: "14 Jun 2024",
    },
    // Code 4: error/repeated scans
    ...Array.from({ length: 4 }).map((_, idx) => ({
      codeId: insertedCodes[3]!.id,
      customerName: "Rajesh Kumar",
      mobileNumber: "+91 99123 88123",
      zipCode: "110001",
      city: "New Delhi",
      scanTime: `09:${15 + idx * 5}:33`,
      scanDate: "14 Jun 2024",
    })),
  ];

  await db.insert(customerScansTable).values(customerScans);
  console.log(`Customer scans: ${customerScans.length} seeded`);

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
