import { beforeEach } from "vitest";

beforeEach(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = "";
});
