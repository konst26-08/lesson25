// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMetrikaCounterId,
  METRIKA_GOALS,
  trackAddToCart,
  trackBeginCheckout,
  trackGoal,
  trackPurchase
} from "./metrika.js";

describe("metrika", () => {
  beforeEach(() => {
    window.dataLayer = [];
    window.ym = vi.fn();
  });

  afterEach(() => {
    delete window.dataLayer;
    delete window.ym;
  });

  it("returns configured counter id", () => {
    expect(getMetrikaCounterId()).toBe(109394182);
  });

  it("exports goal identifiers", () => {
    expect(METRIKA_GOALS.LOGIN_SUCCESS).toBe("login_success");
    expect(METRIKA_GOALS.PURCHASE).toBe("purchase");
  });

  it("sends reachGoal to ym", () => {
    trackGoal("login_success", { source: "email" });

    expect(window.ym).toHaveBeenCalledWith(109394182, "reachGoal", "login_success", {
      source: "email"
    });
  });

  it("pushes add_to_cart to dataLayer and sends goal", () => {
    trackAddToCart({
      id: 1,
      name: "Gym Flex",
      price: 8990,
      quantity: 1,
      brand: "Bold Sport",
      sport: "gym",
      size: "42"
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0].ecommerce.add.products[0]).toMatchObject({
      id: "1",
      name: "Gym Flex",
      price: 8990,
      quantity: 1
    });
    expect(window.ym).toHaveBeenCalledWith(
      109394182,
      "reachGoal",
      METRIKA_GOALS.ADD_TO_CART,
      expect.objectContaining({ product_id: "1" })
    );
  });

  it("pushes begin_checkout to dataLayer", () => {
    trackBeginCheckout([{ id: 2, name: "Run Pro", price: 5000, quantity: 1 }]);

    expect(window.dataLayer[0].ecommerce.checkout.products).toHaveLength(1);
    expect(window.ym).toHaveBeenCalledWith(109394182, "reachGoal", METRIKA_GOALS.BEGIN_CHECKOUT, {
      items_count: 1
    });
  });

  it("pushes purchase to dataLayer with order number", () => {
    trackPurchase({ orderNumber: "ORD-100" }, [
      { id: 2, name: "Run Pro", price: 5000, quantity: 2 }
    ]);

    expect(window.dataLayer[0].ecommerce.purchase.actionField).toMatchObject({
      id: "ORD-100",
      revenue: 10000
    });
    expect(window.ym).toHaveBeenCalledWith(
      109394182,
      "reachGoal",
      METRIKA_GOALS.PURCHASE,
      expect.objectContaining({ order_number: "ORD-100", revenue: 10000 })
    );
  });
});
