// @vitest-environment node
import express from "express";
import request from "supertest";
import bcrypt from "bcryptjs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createServer } from "../createServer.js";
import { createInMemoryUsersRepository } from "../repositories/inMemoryUsersRepository.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { configureLoggerForTests, resetLoggerForTests, LOG_LEVELS } from "../utils/logger.js";

async function createAppWithAdmin() {
  const adminHash = await bcrypt.hash("AdminPass123", 10);
  const usersRepository = createInMemoryUsersRepository([
    {
      id: 1,
      email: "admin@example.com",
      passwordHash: adminHash,
      role: "admin"
    }
  ]);

  return createServer({
    usersRepository,
    jwtSecret: "test_secret_test_secret_test_secret_123",
    jwtExpiresIn: "1h",
    corsOrigins: ["http://localhost:5173"]
  });
}

describe("typical error logging scenarios", () => {
  /** @type {Array<Record<string, unknown>>} */
  let entries;

  beforeEach(() => {
    entries = [];
    configureLoggerForTests({
      minLevel: LOG_LEVELS.debug,
      sinks: [(entry) => entries.push({ ...entry })]
    });
  });

  afterEach(() => {
    resetLoggerForTests();
  });

  it("warn: invalid JSON body", async () => {
    const app = await createAppWithAdmin();

    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ invalid json");

    expect(response.status).toBe(400);
    expect(entries.some((e) => e.level === "warn" && e.message === "Invalid JSON body")).toBe(true);
  });

  it("warn: unauthorized login (401)", async () => {
    const app = await createAppWithAdmin();

    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword1"
    });

    expect(response.status).toBe(401);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warn",
          message: "API 401",
          code: "UNAUTHORIZED",
          path: "/api/auth/login"
        })
      ])
    );
  });

  it("info: validation failed (422)", async () => {
    const app = await createAppWithAdmin();
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "AdminPass123"
    });
    const token = loginResponse.body.data.token;

    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", price: -1 });

    expect(entries.some((e) => e.level === "info" && e.message === "Validation failed")).toBe(true);
  });

  it("info: not found (404)", async () => {
    const app = await createAppWithAdmin();

    await request(app).get("/api/products/999999");

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: "info", message: "API 404", path: "/api/products/999999" })
      ])
    );
  });

  it("error: unhandled exception (500)", async () => {
    const app = express();
    app.get("/api/crash", (_req, _res, next) => {
      next(new Error("Simulated database timeout"));
    });
    app.use(errorHandler);

    const response = await request(app).get("/api/crash");

    expect(response.status).toBe(500);
    expect(entries.some((e) => e.level === "error" && e.message === "Unhandled error")).toBe(true);
    expect(entries.some((e) => e.err === "Simulated database timeout")).toBe(true);
  });
});
