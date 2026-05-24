// @vitest-environment node
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "./createServer.js";
import { createInMemoryUsersRepository } from "./repositories/inMemoryUsersRepository.js";
import { createOAuthStateStore } from "./auth/oauthStateStore.js";

const testJwtSecret = "test_secret_test_secret_test_secret_123";
const frontendUrl = "http://localhost:5173/login/oauth/callback";

function appWithOAuth(overrides = {}) {
  const stateStore = createOAuthStateStore();
  const usersRepository = createInMemoryUsersRepository();

  const oauthService = {
    stateStore,
    startYandexAuthorization: () => {
      const state = stateStore.create();
      return {
        state,
        url: `https://oauth.yandex.ru/authorize?state=${state}`
      };
    },
    completeYandexAuthorization: overrides.completeYandexAuthorization,
    buildFrontendRedirect: (params) => {
      const url = new URL(frontendUrl);
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          url.searchParams.set(key, String(value));
        }
      }
      return url.toString();
    }
  };

  return createServer({
    usersRepository,
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    corsOrigins: ["http://localhost:5173"],
    oauthService
  });
}

describe("OAuth routes", () => {
  it("redirects to yandex authorize url", async () => {
    const app = appWithOAuth({
      completeYandexAuthorization: vi.fn()
    });

    const res = await request(app).get("/api/auth/yandex");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("oauth.yandex.ru/authorize");
  });

  it("redirects to frontend with token on successful callback", async () => {
    const app = appWithOAuth({
      completeYandexAuthorization: vi.fn().mockResolvedValue({
        token: "jwt-token-value",
        user: { id: 1, email: "oauth@example.com", role: "user" }
      })
    });

    const start = await request(app).get("/api/auth/yandex");
    const authorizeUrl = new URL(start.headers.location);
    const state = authorizeUrl.searchParams.get("state");

    const res = await request(app)
      .get("/api/auth/yandex/callback")
      .query({ code: "valid-code", state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(frontendUrl);
    expect(res.headers.location).toContain("token=jwt-token-value");
  });

  it("redirects to frontend with error when provider returns error", async () => {
    const app = appWithOAuth({
      completeYandexAuthorization: vi.fn()
    });

    const res = await request(app)
      .get("/api/auth/yandex/callback")
      .query({ error: "access_denied" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=access_denied");
  });

  it("redirects to frontend with oauth_failed on invalid state", async () => {
    const app = appWithOAuth({
      completeYandexAuthorization: vi.fn().mockRejectedValue(new Error("invalid state"))
    });

    const res = await request(app)
      .get("/api/auth/yandex/callback")
      .query({ code: "valid-code", state: "wrong-state" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=oauth_failed");
  });
});
