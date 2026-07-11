import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { requireAuth, requireRole } from '../lib/session.js';
import { resetAndSeedDatabase } from '../lib/db-reset.js';
import { systemConfigsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Helper to read config from database
const readConfig = async () => {
  try {
    const rows = await db
      .select()
      .from(systemConfigsTable)
      .where(eq(systemConfigsTable.key, "hideMappingCode"))
      .limit(1);

    if (rows.length > 0) {
      return { hideMappingCode: rows[0].value === "true" };
    }
  } catch (err) {
    // ignore
  }
  // Default is true ("turn on it for now")
  return { hideMappingCode: true };
};

// Helper to write config to database
const writeConfig = async (config: { hideMappingCode: boolean }) => {
  try {
    await db
      .insert(systemConfigsTable)
      .values({
        key: "hideMappingCode",
        value: String(config.hideMappingCode),
      })
      .onConflictDoUpdate({
        target: systemConfigsTable.key,
        set: { value: String(config.hideMappingCode) },
      });
  } catch (err) {
    // ignore
  }
};

// Public/standard auth config getter
router.get("/system-config", requireAuth, async (req, res) => {
  const config = await readConfig();
  res.json(config);
});

// Super master config setter
router.post("/system-config", requireAuth, requireRole("super_master"), async (req, res) => {
  const { hideMappingCode } = req.body;
  if (typeof hideMappingCode !== "boolean") {
    res.status(400).json({ error: "Invalid value for hideMappingCode" });
    return;
  }
  const config = { hideMappingCode };
  await writeConfig(config);
  res.json({ success: true, config });
});

// Apply auth and role protection to all routes under /system
router.use("/system", requireAuth, requireRole("super_master"));

router.post("/system/reset-database", async (req, res): Promise<void> => {
  try {
    const { seedData } = req.body;
    req.log.info("Supermaster database reset requested...");
    await resetAndSeedDatabase(db, seedData);
    req.log.info("Database reset completed successfully");
    res.json({ success: true, message: "Database reset and seeded successfully." });
  } catch (err: any) {
    req.log.error({ err }, "Database reset failed");
    res.status(500).json({ error: err.message || "Failed to reset database" });
  }
});

router.get("/system/info", async (req, res): Promise<void> => {
  try {
    res.json({
      env: process.env,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd(),
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch system info");
    res.status(500).json({ error: err.message || "Failed to fetch system info" });
  }
});

export default router;
