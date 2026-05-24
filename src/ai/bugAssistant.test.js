import { describe, expect, it } from "vitest";
import { runBugAssistant } from "./bugAssistant";

describe("runBugAssistant", () => {
  it("returns fallback fixes when text model fails", async () => {
    const result = await runBugAssistant({
      consoleOutput: "TypeError: Cannot read properties of undefined",
      screenshotFile: null,
      note: "Ошибка в карточке товара",
      textModel: async () => {
        throw new Error("model unavailable");
      }
    });

    expect(result.interpretation.issues).toHaveLength(1);
    expect(result.fixes.length).toBeGreaterThan(0);
  });
});
