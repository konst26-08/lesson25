// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  normalizeCreateOrderPayload,
  parsePositiveInteger,
  validateCreateOrderPayload,
  isValidOrderNumber
} from "./ordersValidation.js";

describe("ordersValidation", () => {
  it("accepts string productId from PostgreSQL JSON", () => {
    const payload = {
      items: [
        {
          productId: "1",
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

    expect(validateCreateOrderPayload(payload)).toEqual([]);
    expect(parsePositiveInteger("1")).toBe(1);

    const normalized = normalizeCreateOrderPayload(payload);
    expect(normalized.items[0].productId).toBe(1);
    expect(typeof normalized.items[0].productId).toBe("number");
  });

  it("validates order number format", () => {
    expect(isValidOrderNumber("SU-120001")).toBe(true);
    expect(isValidOrderNumber("SU-000001")).toBe(true);
    expect(isValidOrderNumber("SU-120001'; DROP TABLE orders;--")).toBe(false);
    expect(isValidOrderNumber("invalid")).toBe(false);
  });
});
