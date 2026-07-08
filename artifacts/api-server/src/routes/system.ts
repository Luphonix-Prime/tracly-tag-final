import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { requireAuth, requireRole } from '../lib/session.js';
import { resetAndSeedDatabase } from '../lib/db-reset.js';
import fs from "fs";
import path from "path";

const router: IRouter = Router();

// Path to system config file
const configPath = path.join(process.cwd(), "system_config.json");

// Helper to read config
const readConfig = () => {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    // ignore
  }
  return { hideMappingCode: false };
};

// Helper to write config
const writeConfig = (config: { hideMappingCode: boolean }) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    // ignore
  }
};

// Public/standard auth config getter
router.get("/system-config", requireAuth, (req, res) => {
  const config = readConfig();
  res.json(config);
});

// Super master config setter
router.post("/system-config", requireAuth, requireRole("super_master"), (req, res) => {
  const { hideMappingCode } = req.body;
  if (typeof hideMappingCode !== "boolean") {
    res.status(400).json({ error: "Invalid value for hideMappingCode" });
    return;
  }
  const config = { hideMappingCode };
  writeConfig(config);
  res.json({ success: true, config });
});

// Apply auth and role protection to all routes under /system
router.use("/system", requireAuth, requireRole("super_master"));

router.post("/system/reset-database", async (req, res): Promise<void> => {
  try {
    req.log.info("Supermaster database reset requested...");
    await resetAndSeedDatabase(db);
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
