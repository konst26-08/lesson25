import { access } from "node:fs/promises";
import { constants } from "node:fs";

const requiredPaths = [
  "src/main.js",
  "src/app.js",
  "src/router/router.js",
  "src/router/routes.js",
  "src/state/store.js",
  "src/pages/HomePage.js",
  "src/pages/CatalogPage.js",
  "src/pages/ProductPage.js",
  "src/pages/CartPage.js",
  "src/pages/CheckoutPage.js",
  "src/pages/OrderSuccessPage.js",
  "src/pages/BugAssistantPage.js"
];

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missing = [];

  for (const path of requiredPaths) {
    const exists = await pathExists(path);
    if (!exists) {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    console.error("Project structure check failed. Missing files:");
    missing.forEach((path) => console.error(`- ${path}`));
    process.exit(1);
  }

  console.log("Project structure check passed.");
}

main();
