import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { requireAuth, requireRole } from '../lib/session.js';
import { resetAndSeedDatabase } from '../lib/db-reset.js';
import { systemConfigsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Helper to read config from database
const readConfig = async () => {
  let hideMappingCode = true;
  let datamatrixUrlMode = false;
  let hidePackagingHierarchy = true;
  let enableOtpSystem = true;
  try {
    const rows = await db
      .select()
      .from(systemConfigsTable);

    const mapCodeRow = rows.find(r => r.key === "hideMappingCode");
    if (mapCodeRow) {
      hideMappingCode = mapCodeRow.value === "true";
    }
    const dmRow = rows.find(r => r.key === "datamatrixUrlMode");
    if (dmRow) {
      datamatrixUrlMode = dmRow.value === "true";
    }
    const phRow = rows.find(r => r.key === "hidePackagingHierarchy");
    if (phRow) {
      hidePackagingHierarchy = phRow.value === "true";
    }
    const otpRow = rows.find(r => r.key === "enableOtpSystem");
    if (otpRow) {
      enableOtpSystem = otpRow.value !== "false";
    }
  } catch (err) {
    // ignore
  }
  return { hideMappingCode, datamatrixUrlMode, hidePackagingHierarchy, enableOtpSystem };
};

// Helper to write config to database
const writeConfig = async (config: { hideMappingCode?: boolean; datamatrixUrlMode?: boolean; hidePackagingHierarchy?: boolean; enableOtpSystem?: boolean }) => {
  try {
    if (config.hideMappingCode !== undefined) {
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
    }
    if (config.datamatrixUrlMode !== undefined) {
      await db
        .insert(systemConfigsTable)
        .values({
          key: "datamatrixUrlMode",
          value: String(config.datamatrixUrlMode),
        })
        .onConflictDoUpdate({
          target: systemConfigsTable.key,
          set: { value: String(config.datamatrixUrlMode) },
        });
    }
    if (config.hidePackagingHierarchy !== undefined) {
      await db
        .insert(systemConfigsTable)
        .values({
          key: "hidePackagingHierarchy",
          value: String(config.hidePackagingHierarchy),
        })
        .onConflictDoUpdate({
          target: systemConfigsTable.key,
          set: { value: String(config.hidePackagingHierarchy) },
        });
    }
    if (config.enableOtpSystem !== undefined) {
      await db
        .insert(systemConfigsTable)
        .values({
          key: "enableOtpSystem",
          value: String(config.enableOtpSystem),
        })
        .onConflictDoUpdate({
          target: systemConfigsTable.key,
          set: { value: String(config.enableOtpSystem) },
        });
    }
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
  const { hideMappingCode, datamatrixUrlMode, hidePackagingHierarchy, hidePackagingLevel, enableOtpSystem } = req.body;
  const updates: { hideMappingCode?: boolean; datamatrixUrlMode?: boolean; hidePackagingHierarchy?: boolean; hidePackagingLevel?: boolean; enableOtpSystem?: boolean } = {};
  
  if (hideMappingCode !== undefined) {
    if (typeof hideMappingCode !== "boolean") {
      res.status(400).json({ error: "Invalid value for hideMappingCode" });
      return;
    }
    updates.hideMappingCode = hideMappingCode;
  }
  
  if (datamatrixUrlMode !== undefined) {
    if (typeof datamatrixUrlMode !== "boolean") {
      res.status(400).json({ error: "Invalid value for datamatrixUrlMode" });
      return;
    }
    updates.datamatrixUrlMode = datamatrixUrlMode;
  }

  if (hidePackagingHierarchy !== undefined) {
    if (typeof hidePackagingHierarchy !== "boolean") {
      res.status(400).json({ error: "Invalid value for hidePackagingHierarchy" });
      return;
    }
    updates.hidePackagingHierarchy = hidePackagingHierarchy;
  }

  if (hidePackagingLevel !== undefined) {
    if (typeof hidePackagingLevel !== "boolean") {
      res.status(400).json({ error: "Invalid value for hidePackagingLevel" });
      return;
    }
    updates.hidePackagingLevel = hidePackagingLevel;
  }

  if (enableOtpSystem !== undefined) {
    if (typeof enableOtpSystem !== "boolean") {
      res.status(400).json({ error: "Invalid value for enableOtpSystem" });
      return;
    }
    updates.enableOtpSystem = enableOtpSystem;
  }
  
  await writeConfig(updates);
  const config = await readConfig();
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
