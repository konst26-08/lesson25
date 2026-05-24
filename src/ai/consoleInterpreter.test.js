import { describe, expect, it } from "vitest";
import { interpretConsoleErrors } from "./consoleInterpreter";

describe("interpretConsoleErrors", () => {
  it("parses console logs and detects severity", () => {
    const result = interpretConsoleErrors(
      "TypeError: Cannot read properties of undefined\nWarning: deprecated API\nNetwork failed"
    );

    expect(result.issues).toHaveLength(3);
    expect(result.issues[0].severity).toBe("high");
    expect(result.issues[1].severity).toBe("medium");
    expect(result.summary).toContain("Найдено 3 сообщений");
  });

  it("returns empty interpretation for blank logs", () => {
    const result = interpretConsoleErrors("   ");

    expect(result.issues).toHaveLength(0);
    expect(result.summary).toBe("Консольные ошибки не переданы.");
  });
});
