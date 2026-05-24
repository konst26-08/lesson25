#!/usr/bin/env node
/**
 * Post-deploy smoke test: health.json, homepage, JS/CSS assets from index.html.
 * Usage: node scripts/verify-smoke-deploy.mjs https://site.netlify.app
 */

const siteUrl = (process.argv[2] ?? process.env.SITE_URL ?? "").replace(/\/$/, "");

if (!siteUrl) {
  console.error("Usage: node scripts/verify-smoke-deploy.mjs <SITE_URL>");
  process.exit(1);
}

async function check(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status} for ${url}`);
  }
  return response;
}

async function main() {
  console.log(`Smoke test: ${siteUrl}`);

  const healthResponse = await check(`${siteUrl}/health.json`, "health.json");
  const health = await healthResponse.json();
  if (health.status !== "ok") {
    throw new Error("health.json status is not ok");
  }
  console.log("OK /health.json");

  const homeResponse = await check(`${siteUrl}/`, "homepage");
  const html = await homeResponse.text();
  console.log("OK /");

  const scriptMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const styleMatch = html.match(/href="(\/assets\/[^"]+\.css)"/);

  if (!scriptMatch || !styleMatch) {
    throw new Error("index.html missing /assets references");
  }

  await check(`${siteUrl}${scriptMatch[1]}`, "js bundle");
  console.log(`OK ${scriptMatch[1]}`);

  await check(`${siteUrl}${styleMatch[1]}`, "css bundle");
  console.log(`OK ${styleMatch[1]}`);

  console.log("Deploy smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
