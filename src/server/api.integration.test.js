// @vitest-environment node
/**
 * Полное покрытие REST API: успешные ответы и обработка ошибок.
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { createServer } from "./createServer.js";
import { createInMemoryUsersRepository } from "./repositories/inMemoryUsersRepository.js";

const testJwtSecret = "test_secret_test_secret_test_secret_123";

async function appWithAdmin() {
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
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    corsOrigins: ["http://localhost:5173"]
  });
}

async function adminToken(app) {
  const res = await request(app).post("/api/auth/login").send({
    email: "admin@example.com",
    password: "AdminPass123"
  });
  expect(res.status).toBe(200);
  return res.body.data.token;
}

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "not_configured" });
  });
});

describe("GET /api/sports", () => {
  it("returns catalog with id and label", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/sports");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data[0]).toHaveProperty("id");
    expect(res.body.data[0]).toHaveProperty("label");
  });
});

describe("GET /api/products", () => {
  it("returns array with default seed items", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.data.some((p) => p.name === "Racer Pro")).toBe(true);
  });
});

describe("GET /api/products/:id", () => {
  it("returns 200 and product for valid id", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/products/1");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.name).toBe("Racer Pro");
  });

  it("returns 400 BAD_REQUEST for invalid id", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/products/not-a-number");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });

  it("returns 404 NOT_FOUND for missing id", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/products/99999");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/auth/register", () => {
  it("returns 201 and token", async () => {
    const app = await appWithAdmin();
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "StrongPass123"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("newuser@example.com");
    expect(res.body.data.user.role).toBe("user");
    expect(typeof res.body.data.token).toBe("string");
  });

  it("returns 409 CONFLICT for duplicate email", async () => {
    const app = await appWithAdmin();
    await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "StrongPass123"
    });
    const res = await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "AnotherPass123"
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });
});

describe("POST /api/auth/login", () => {
  it("returns 401 for wrong password", async () => {
    const app = await appWithAdmin();
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword1"
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for unknown email", async () => {
    const app = await appWithAdmin();
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "StrongPass123"
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 422 for invalid payload", async () => {
    const app = await appWithAdmin();
    const res = await request(app).post("/api/auth/login").send({
      email: "bad",
      password: ""
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without Authorization", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for malformed Bearer token", async () => {
    const app = await appWithAdmin();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.valid.jwt");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 200 with user for valid token", async () => {
    const app = await appWithAdmin();
    const token = await adminToken(app);
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("admin@example.com");
    expect(res.body.data.role).toBe("admin");
  });
});

describe("POST /api/products (admin)", () => {
  it("returns 401 without token", async () => {
    const app = await appWithAdmin();
    const res = await request(app).post("/api/products").send({
      name: "X",
      price: 100,
      sport: "running",
      brand: "Y"
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 422 for invalid body", async () => {
    const app = await appWithAdmin();
    const token = await adminToken(app);
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", price: -1, sport: "", brand: "" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});

describe("PUT /api/products/:id (admin)", () => {
  it("returns 404 when product missing", async () => {
    const app = await appWithAdmin();
    const token = await adminToken(app);
    const res = await request(app)
      .put("/api/products/99999")
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 100 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid id", async () => {
    const app = await appWithAdmin();
    const token = await adminToken(app);
    const res = await request(app)
      .put("/api/products/abc")
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 100 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });
});

describe("DELETE /api/products/:id (admin)", () => {
  it("returns 404 when product missing", async () => {
    const app = await appWithAdmin();
    const token = await adminToken(app);
    const res = await request(app)
      .delete("/api/products/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

describe("Unknown routes", () => {
  it("returns 404 NOT_FOUND", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

describe("Invalid JSON body", () => {
  it("returns 400 INVALID_JSON", async () => {
    const app = await appWithAdmin();
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ not json");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_JSON");
  });
});

describe("CORS policy", () => {
  it("returns 403 CORS_FORBIDDEN for disallowed Origin", async () => {
    const app = await appWithAdmin();
    const res = await request(app).get("/api/health").set("Origin", "http://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CORS_FORBIDDEN");
  });
});
