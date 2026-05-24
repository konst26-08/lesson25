import { describe, expect, it, vi } from "vitest";
import { navigateTo } from "./navigation";

describe("navigateTo", () => {
  it("pushes history and emits popstate for new url", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    window.history.replaceState({}, "", "/catalog");

    navigateTo("/catalog?sport=running");

    expect(window.location.pathname + window.location.search).toBe("/catalog?sport=running");
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not navigate if url is identical", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    window.history.replaceState({}, "", "/catalog?sport=running");

    navigateTo("/catalog?sport=running");

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
