// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createOAuthStateStore } from "./oauthStateStore.js";
import {
  createYandexOAuthClient,
  extractYandexDisplayName,
  extractYandexEmail
} from "./yandexOAuth.js";
import { createOAuthService } from "./oauthService.js";
import { createInMemoryUsersRepository } from "../repositories/inMemoryUsersRepository.js";

describe("oauthStateStore", () => {
  it("creates and consumes state once", () => {
    const store = createOAuthStateStore();
    const state = store.create();
    expect(store.consume(state)).toBe(true);
    expect(store.consume(state)).toBe(false);
  });
});

describe("yandexOAuth helpers", () => {
  it("extracts email and display name from profile", () => {
    expect(
      extractYandexEmail({
        default_email: "User@Example.com"
      })
    ).toBe("user@example.com");

    expect(
      extractYandexDisplayName({
        first_name: "Ivan",
        last_name: "Petrov"
      })
    ).toBe("Ivan Petrov");
  });

  it("builds authorization url", () => {
    const client = createYandexOAuthClient({
      clientId: "test-client",
      clientSecret: "test-secret",
      redirectUri: "http://localhost:3001/api/auth/yandex/callback"
    });

    const url = client.buildAuthorizationUrl("state-123");
    expect(url).toContain("oauth.yandex.ru/authorize");
    expect(url).toContain("client_id=test-client");
    expect(url).toContain("state=state-123");
  });
});

describe("createOAuthService", () => {
  it("creates user and returns jwt on successful yandex auth", async () => {
    const usersRepository = createInMemoryUsersRepository();
    const stateStore = createOAuthStateStore();
    const state = stateStore.create();

    const yandexClient = {
      buildAuthorizationUrl: vi.fn(),
      exchangeCodeForToken: vi.fn().mockResolvedValue("access-token"),
      fetchUserProfile: vi.fn().mockResolvedValue({
        id: "1001",
        default_email: "oauth-user@example.com",
        first_name: "OAuth",
        last_name: "User"
      })
    };

    const service = createOAuthService({
      usersRepository,
      jwtSecret: "test_secret_test_secret_test_secret_123",
      jwtExpiresIn: "1h",
      yandexConfig: {
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "http://localhost:3001/api/auth/yandex/callback"
      },
      frontendSuccessUrl: "http://localhost:5173/login/oauth/callback",
      stateStore,
      yandexClient
    });

    const result = await service.completeYandexAuthorization("auth-code", state);

    expect(result.user.email).toBe("oauth-user@example.com");
    expect(result.token).toEqual(expect.any(String));

    const linked = await usersRepository.findByOAuth("yandex", "1001");
    expect(linked?.email).toBe("oauth-user@example.com");
  });

  it("rejects invalid oauth state", async () => {
    const service = createOAuthService({
      usersRepository: createInMemoryUsersRepository(),
      jwtSecret: "test_secret_test_secret_test_secret_123",
      jwtExpiresIn: "1h",
      yandexConfig: {
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "http://localhost:3001/api/auth/yandex/callback"
      },
      frontendSuccessUrl: "http://localhost:5173/login/oauth/callback",
      yandexClient: {
        exchangeCodeForToken: vi.fn(),
        fetchUserProfile: vi.fn()
      }
    });

    await expect(service.completeYandexAuthorization("code", "bad-state")).rejects.toThrow(
      /Invalid or expired OAuth state/
    );
  });
});
