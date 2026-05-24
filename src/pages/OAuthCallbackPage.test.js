// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderOAuthCallbackPage } from "./OAuthCallbackPage.js";
import { METRIKA_GOALS } from "../analytics/metrika.js";

vi.mock("../api/hooks/auth.js", () => ({
  fetchMe: vi.fn()
}));

vi.mock("../utils/navigation.js", () => ({
  navigateTo: vi.fn()
}));

vi.mock("../analytics/metrika.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    trackGoal: vi.fn()
  };
});

import { fetchMe } from "../api/hooks/auth.js";
import { navigateTo } from "../utils/navigation.js";
import { trackGoal } from "../analytics/metrika.js";

describe("OAuthCallbackPage analytics integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("sends oauth_yandex_success goal after successful token exchange", async () => {
    fetchMe.mockResolvedValue({
      id: 1,
      email: "oauth@example.com",
      role: "user"
    });

    window.history.replaceState({}, "", "/login/oauth/callback?token=test-jwt");

    const store = {
      setState: vi.fn()
    };

    renderOAuthCallbackPage({ store });

    await vi.waitFor(() => {
      expect(trackGoal).toHaveBeenCalledWith(METRIKA_GOALS.OAUTH_YANDEX_SUCCESS);
    });

    expect(navigateTo).toHaveBeenCalledWith("/account/orders");
    expect(store.setState).toHaveBeenCalled();
  });

  it("does not send analytics goal when OAuth error is present", async () => {
    window.history.replaceState({}, "", "/login/oauth/callback?error=access_denied");

    renderOAuthCallbackPage({ store: { setState: vi.fn() } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(trackGoal).not.toHaveBeenCalled();
    expect(fetchMe).not.toHaveBeenCalled();
  });
});
