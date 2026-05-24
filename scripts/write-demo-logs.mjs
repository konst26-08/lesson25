#!/usr/bin/env node
/**
 * Генерирует пример logs/api.log для демонстрации анализа (шаг 7).
 * Запуск: npm run logs:demo
 */

import fs from "node:fs";
import path from "node:path";

const logFile = path.resolve(process.env.LOG_FILE ?? "logs/api.log");
const dir = path.dirname(logFile);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const samples = [
  {
    timestamp: "2026-05-24T10:00:00.000Z",
    level: "info",
    service: "stepup-api",
    message: "REST API started",
    url: "http://localhost:3001",
    database: "postgresql"
  },
  {
    timestamp: "2026-05-24T10:00:05.123Z",
    level: "http",
    service: "stepup-api",
    message: "HTTP request",
    method: "GET",
    path: "/api/health",
    status: 200,
    durationMs: 12
  },
  {
    timestamp: "2026-05-24T10:01:10.456Z",
    level: "warn",
    service: "stepup-api",
    message: "API 401",
    method: "POST",
    path: "/api/auth/login",
    code: "INVALID_CREDENTIALS"
  },
  {
    timestamp: "2026-05-24T10:02:00.789Z",
    level: "info",
    service: "stepup-api",
    message: "Validation failed",
    method: "POST",
    path: "/api/products",
    details: [{ field: "price", message: "must be positive" }]
  },
  {
    timestamp: "2026-05-24T10:03:30.000Z",
    level: "error",
    service: "stepup-api",
    message: "Unhandled error",
    err: "Connection terminated unexpectedly",
    stack: "Error: Connection terminated unexpectedly\n    at Pool.query (...)"
  },
  {
    timestamp: "2026-05-24T10:03:31.100Z",
    level: "error",
    service: "stepup-api",
    message: "PostgreSQL connection failed",
    err: "ECONNREFUSED",
    name: "Error"
  }
];

const body = `${samples.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
fs.writeFileSync(logFile, body, "utf8");

console.log(`Wrote ${samples.length} demo log entries to ${logFile}`);
console.log("Run: npm run logs:analyze");
console.log("Run: npm run logs:analyze -- --level error");
