#!/usr/bin/env node
/**
 * Анализ централизованного JSONL-файла логов (logs/api.log).
 *
 * Примеры:
 *   node scripts/analyze-logs.mjs
 *   node scripts/analyze-logs.mjs --level error
 *   node scripts/analyze-logs.mjs --search "PostgreSQL"
 *   node scripts/analyze-logs.mjs --last 50
 */

import fs from "node:fs";
import path from "node:path";

const DEFAULT_LOG_FILE = path.resolve("logs/api.log");

function parseArgs(argv) {
  const options = {
    file: process.env.LOG_FILE?.trim() || DEFAULT_LOG_FILE,
    level: null,
    search: null,
    last: null,
    summary: true
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file" && argv[i + 1]) {
      options.file = path.resolve(argv[++i]);
    } else if (arg === "--level" && argv[i + 1]) {
      options.level = argv[++i].toLowerCase();
    } else if (arg === "--search" && argv[i + 1]) {
      options.search = argv[++i];
    } else if (arg === "--last" && argv[i + 1]) {
      options.last = Number.parseInt(argv[++i], 10);
    } else if (arg === "--no-summary") {
      options.summary = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/analyze-logs.mjs [options]

Options:
  --file <path>     Log file (default: logs/api.log or LOG_FILE)
  --level <name>    Filter: error | warn | info | http | debug
  --search <text>   Substring search in full JSON line
  --last <n>        Show only last N matching entries
  --no-summary      Skip aggregate summary
  -h, --help        Show this help
`);
}

function readEntries(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Log file not found: ${filePath}`);
    console.error("Start API with LOG_FILE=logs/api.log and make a few requests.");
    process.exit(1);
  }

  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  const entries = [];

  for (const [index, line] of lines.entries()) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      console.warn(`Skipping invalid JSON at line ${index + 1}`);
    }
  }

  return entries;
}

function matchesFilters(entry, options) {
  if (options.level) {
    const normalized = options.level === "warning" ? "warn" : options.level;
    if (entry.level !== normalized) {
      return false;
    }
  }

  if (options.search) {
    const haystack = JSON.stringify(entry).toLowerCase();
    if (!haystack.includes(options.search.toLowerCase())) {
      return false;
    }
  }

  return true;
}

function printSummary(entries) {
  const byLevel = {};
  for (const entry of entries) {
    byLevel[entry.level] = (byLevel[entry.level] ?? 0) + 1;
  }

  console.log("\n--- Summary ---");
  console.log(`Total entries: ${entries.length}`);
  for (const [level, count] of Object.entries(byLevel).sort()) {
    console.log(`  ${level}: ${count}`);
  }

  const errors = entries.filter((e) => e.level === "error");
  if (errors.length > 0) {
    console.log("\nRecent error messages:");
    for (const entry of errors.slice(-5)) {
      console.log(`  [${entry.timestamp}] ${entry.message}${entry.err ? ` — ${entry.err}` : ""}`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv);
  const allEntries = readEntries(options.file);
  let filtered = allEntries.filter((entry) => matchesFilters(entry, options));

  if (options.last && options.last > 0) {
    filtered = filtered.slice(-options.last);
  }

  console.log(`Log file: ${options.file}`);
  console.log(`Matching entries: ${filtered.length} / ${allEntries.length}`);

  for (const entry of filtered) {
    console.log(JSON.stringify(entry));
  }

  if (options.summary) {
    printSummary(filtered.length > 0 ? filtered : allEntries);
  }
}

main();
