#!/usr/bin/env node
/**
 * Проверяет, что production-сборка содержит index.html, health.json и assets из HTML.
 * Используется в CI после npm run build.
 */

import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.argv[2] ?? "dist");
const indexPath = path.join(distDir, "index.html");
const healthPath = path.join(distDir, "health.json");

function fail(message) {
  console.error(`Build verification failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail(`missing ${indexPath}`);
}

if (!fs.existsSync(healthPath)) {
  fail(`missing ${healthPath}`);
}

const health = JSON.parse(fs.readFileSync(healthPath, "utf8"));
if (health.status !== "ok") {
  fail("health.json must contain status ok");
}

const html = fs.readFileSync(indexPath, "utf8");
const scriptMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
const styleMatch = html.match(/href="(\/assets\/[^"]+\.css)"/);

if (!scriptMatch) {
  fail("index.html does not reference /assets/*.js");
}

if (!styleMatch) {
  fail("index.html does not reference /assets/*.css");
}

for (const [, assetPath] of [scriptMatch, styleMatch]) {
  const filePath = path.join(distDir, assetPath.replace(/^\//, ""));
  if (!fs.existsSync(filePath)) {
    fail(`referenced asset not found: ${assetPath}`);
  }
  const size = fs.statSync(filePath).size;
  if (size < 100) {
    fail(`asset too small: ${assetPath}`);
  }
  console.log(`OK ${assetPath} (${size} bytes)`);
}

console.log("Build asset verification passed.");
