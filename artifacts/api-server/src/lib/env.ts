import fs from "fs";
import path from "path";

/**
 * Loads key-value pairs from a `.env` file at the root workspace or server root
 * directly into process.env if they are not already defined.
 */
export function loadEnv(): void {
  const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../.env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        const lines = content.split(/\r?\n/);
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          
          const equalIndex = trimmed.indexOf("=");
          if (equalIndex > 0) {
            const key = trimmed.slice(0, equalIndex).trim();
            let val = trimmed.slice(equalIndex + 1).trim();
            
            // Strip wrapping quotes
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            
            // Only assign if it is not already in process.env
            if (!(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
        
        // Successfully loaded from one location
        break;
      } catch (err) {
        console.error(`Failed to read environment file at ${envPath}:`, err);
      }
    }
  }
}
