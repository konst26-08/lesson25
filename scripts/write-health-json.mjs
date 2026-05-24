import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(rootDir, "public");
const outputPath = join(publicDir, "health.json");

mkdirSync(publicDir, { recursive: true });

const payload = {
  status: "ok",
  service: "stepup-frontend",
  timestamp: new Date().toISOString(),
  environment: process.env.NETLIFY === "true" ? "netlify" : "build"
};

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
