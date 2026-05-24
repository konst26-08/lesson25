// @vitest-environment node
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { configureLoggerForTests, resetLoggerForTests, logger, LOG_LEVELS } from "./logger.js";

describe("logger", () => {
  let entries;

  beforeEach(() => {
    entries = [];
    configureLoggerForTests({
      minLevel: LOG_LEVELS.debug,
      sinks: [(entry) => entries.push(entry)]
    });
  });

  afterEach(() => {
    resetLoggerForTests();
  });

  it("writes structured JSON with required fields", () => {
    logger.info("Test message", { userId: 42 });

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.level).toBe("info");
    expect(entry.service).toBe("stepup-api");
    expect(entry.message).toBe("Test message");
    expect(entry.userId).toBe(42);
  });

  it("respects log level threshold", () => {
    configureLoggerForTests({
      minLevel: LOG_LEVELS.warn,
      sinks: [(entry) => entries.push(entry)]
    });

    logger.info("hidden");
    logger.warn("visible");
    logger.error("visible too");

    expect(entries.map((e) => e.level)).toEqual(["warn", "error"]);
  });

  it("logs Error objects at error level with stack", () => {
    const err = new Error("boom");
    logger.error("Operation failed", err);

    expect(entries[0].level).toBe("error");
    expect(entries[0].err).toBe("boom");
    expect(entries[0].stack).toContain("Error: boom");
  });

  it("supports warning alias for warn level", () => {
    logger.warning("Rate limit approaching", { path: "/api/auth/login" });

    expect(entries[0].level).toBe("warn");
    expect(entries[0].message).toBe("Rate limit approaching");
  });

  it("always writes http access logs regardless of LOG_LEVEL", () => {
    configureLoggerForTests({
      minLevel: LOG_LEVELS.error,
      sinks: [(entry) => entries.push(entry)]
    });

    logger.http("HTTP request", { method: "GET", path: "/api/health", status: 200 });

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("http");
    expect(entries[0].method).toBe("GET");
  });
});
