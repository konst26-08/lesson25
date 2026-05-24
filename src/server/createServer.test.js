// @vitest-environment node
import request from "supertest";
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { createServer } from "./createServer.js";
import { createInMemoryUsersRepository } from "./repositories/inMemoryUsersRepository.js";

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

describe("REST API /api/products", () => {
  it("returns products list", async () => {
    const app = await createAppWithAdmin();

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it("creates and reads product by id", async () => {
    const app = await createAppWithAdmin();
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "AdminPass123"
    });
    const token = loginResponse.body.data.token;

    const createResponse = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "City Motion",
        price: 7990,
        sport: "casual",
        brand: "StepUp"
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toBeDefined();

    const productId = createResponse.body.data.id;
    const getResponse = await request(app).get(`/api/products/${productId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.name).toBe("City Motion");
  });

  it("updates and deletes product", async () => {
    const app = await createAppWithAdmin();
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "AdminPass123"
    });
    const token = loginResponse.body.data.token;

    const createResponse = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ultra Run",
        price: 11990,
        sport: "running",
        brand: "Bold Sport"
      });
    const productId = createResponse.body.data.id;

    const updateResponse = await request(app)
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        price: 9990,
        isActive: false
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.price).toBe(9990);
    expect(updateResponse.body.data.isActive).toBe(false);

    const deleteResponse = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteResponse.status).toBe(204);

    const readAfterDelete = await request(app).get(`/api/products/${productId}`);
    expect(readAfterDelete.status).toBe(404);
  });

  it("returns validation error with code for invalid register payload", async () => {
    const app = await createAppWithAdmin();

    const response = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "short"
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(response.body.details)).toBe(true);
  });

  it("registers and logs in a user", async () => {
    const app = await createAppWithAdmin();

    const registerResponse = await request(app).post("/api/auth/register").send({
      email: "user@example.com",
      password: "StrongPass123"
    });
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.token).toBeDefined();

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "StrongPass123"
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.user.email).toBe("user@example.com");
  });

  it("blocks write operation for non-admin users", async () => {
    const app = await createAppWithAdmin();

    const registerResponse = await request(app).post("/api/auth/register").send({
      email: "limited@example.com",
      password: "StrongPass123"
    });
    const userToken = registerResponse.body.data.token;

    const createResponse = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        name: "Blocked Item",
        price: 5000,
        sport: "running",
        brand: "StepUp"
      });

    expect(createResponse.status).toBe(403);
    expect(createResponse.body.code).toBe("FORBIDDEN");
  });
});

describe("REST API /api/sports", () => {
  it("returns sports catalog", async () => {
    const app = await createAppWithAdmin();

    const response = await request(app).get("/api/sports");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.some((item) => item.id === "running")).toBe(true);
  });
});

describe("REST API /api/orders", () => {
  it("returns orders for authenticated user", async () => {
    const app = await createAppWithAdmin();
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "AdminPass123"
    });
    const token = loginResponse.body.data.token;

    const response = await request(app).get("/api/orders").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({
      orderNumber: expect.any(String),
      createdAt: expect.any(String),
      status: expect.any(String),
      total: expect.any(Number)
    });
  });

  it("returns order details by order number", async () => {
    const app = await createAppWithAdmin();
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "AdminPass123"
    });
    const token = loginResponse.body.data.token;

    const response = await request(app)
      .get("/api/orders/SU-120001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.orderNumber).toBe("SU-120001");
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  it("requires authentication", async () => {
    const app = await createAppWithAdmin();

    const response = await request(app).get("/api/orders");

    expect(response.status).toBe(401);
  });

  it("creates order and returns it in list", async () => {
    const app = await createAppWithAdmin();
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "AdminPass123"
    });
    const token = loginResponse.body.data.token;

    const createResponse = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productId: 1,
            productName: "Racer Pro (42)",
            quantity: 1,
            unitPrice: 10990
          }
        ],
        contacts: {
          name: "Иван",
          phone: "+79990000000",
          email: "buyer@example.com"
        },
        address: {
          city: "Москва",
          street: "Ленина",
          house: "10"
        }
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.orderNumber).toMatch(/^SU-/);
    expect(createResponse.body.data.total).toBe(10990);

    const listResponse = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${token}`);

    const createdNumber = createResponse.body.data.orderNumber;
    expect(listResponse.body.data.some((order) => order.orderNumber === createdNumber)).toBe(true);
  });
});
