import { describe, expect, it } from "vitest";
import { validateEmail, validatePhone, validateRequired } from "./validation";

describe("validation helpers", () => {
  it("accepts valid required field, phone and email", () => {
    expect(validateRequired("StepUp")).toBe(true);
    expect(validatePhone("+79991234567")).toBe(true);
    expect(validateEmail("test@stepup.ru")).toBe(true);
  });

  it("rejects invalid input values", () => {
    expect(validateRequired("   ")).toBe(false);
    expect(validatePhone("123")).toBe(false);
    expect(validateEmail("not-an-email")).toBe(false);
  });
});
