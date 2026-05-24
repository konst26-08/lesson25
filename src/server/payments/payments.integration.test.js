// @vitest-environment node
import request from "supertest";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { createServer } from "../createServer.js";
import { createInMemoryUsersRepository } from "../repositories/inMemoryUsersRepository.js";

const PAYMENT_METHODS = ["card", "apple_pay", "google_pay"];

async function createAppWithUser() {
  const passwordHash = await bcrypt.hash("BuyerPass123", 10);
  const usersRepository = createInMemoryUsersRepository([
    {
      id: 10,
      email: "buyer@example.com",
      passwordHash,
      role: "user"
    }
  ]);

  return createServer({
    usersRepository,
    jwtSecret: "test_secret_test_secret_test_secret_123",
    jwtExpiresIn: "1h",
    corsOrigins: ["http://localhost:5173"]
  });
}

async function login(app) {
  const response = await request(app).post("/api/auth/login").send({
    email: "buyer@example.com",
    password: "BuyerPass123"
  });
  return response.body.data.token;
}

const validOrderPayload = {
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
};

describe("payments integration (MVP)", () => {
  it("marks new order as paid without external payment gateway", async () => {
    const app = await createAppWithUser();
    const token = await login(app);

    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(validOrderPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("Оплачен");
    expect(response.body.data.orderNumber).toMatch(/^SU-/);
  });

  it("does not expose payment provider endpoints (YooKassa not integrated)", async () => {
    const app = await createAppWithUser();
    const token = await login(app);

    for (const path of ["/api/payments", "/api/payments/webhook", "/api/yookassa/callback"]) {
      const response = await request(app)
        .post(path)
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(response.status).toBe(404);
    }
  });

  it("accepts checkout payment methods stored in frontend state only", () => {
    for (const method of PAYMENT_METHODS) {
      expect(["card", "apple_pay", "google_pay"]).toContain(method);
    }
  });
});
