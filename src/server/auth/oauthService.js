import jwt from "jsonwebtoken";
import {
  createYandexOAuthClient,
  extractYandexDisplayName,
  extractYandexEmail
} from "./yandexOAuth.js";
import { createOAuthStateStore } from "./oauthStateStore.js";

const YANDEX_PROVIDER = "yandex";

export function buildOAuthFrontendRedirect(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function createOAuthService({
  usersRepository,
  jwtSecret,
  jwtExpiresIn,
  yandexConfig,
  frontendSuccessUrl,
  stateStore = createOAuthStateStore(),
  yandexClient = createYandexOAuthClient(yandexConfig)
}) {
  function issueAuthToken(user) {
    const token = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: jwtExpiresIn,
      algorithm: "HS256"
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async function resolveYandexUser(profile) {
    const providerUserId = String(profile.id);
    const email = extractYandexEmail(profile);
    if (!email) {
      throw new Error("Yandex profile does not include an email address.");
    }

    const displayName = extractYandexDisplayName(profile);

    const linked = await usersRepository.findByOAuth(YANDEX_PROVIDER, providerUserId);
    if (linked) {
      return linked;
    }

    const existingByEmail = await usersRepository.findByEmail(email);
    if (existingByEmail) {
      await usersRepository.linkOAuthAccount(existingByEmail.id, YANDEX_PROVIDER, providerUserId);
      return existingByEmail;
    }

    return usersRepository.createFromOAuth({
      email,
      firstName: displayName,
      provider: YANDEX_PROVIDER,
      providerUserId,
      role: "user"
    });
  }

  return {
    stateStore,

    startYandexAuthorization() {
      const state = stateStore.create();
      const url = yandexClient.buildAuthorizationUrl(state);
      return { state, url };
    },

    async completeYandexAuthorization(code, state) {
      if (!stateStore.consume(state)) {
        throw new Error("Invalid or expired OAuth state.");
      }

      const accessToken = await yandexClient.exchangeCodeForToken(code);
      const profile = await yandexClient.fetchUserProfile(accessToken);
      const user = await resolveYandexUser(profile);
      return issueAuthToken(user);
    },

    buildFrontendRedirect(params) {
      return buildOAuthFrontendRedirect(frontendSuccessUrl, params);
    }
  };
}

export function createOAuthServiceFromEnv({
  usersRepository,
  jwtSecret,
  jwtExpiresIn,
  yandexOAuth,
  oauthFrontendSuccessUrl
}) {
  if (!yandexOAuth?.clientId || !yandexOAuth?.clientSecret || !yandexOAuth?.redirectUri) {
    return null;
  }

  if (!oauthFrontendSuccessUrl) {
    return null;
  }

  return createOAuthService({
    usersRepository,
    jwtSecret,
    jwtExpiresIn,
    yandexConfig: yandexOAuth,
    frontendSuccessUrl: oauthFrontendSuccessUrl
  });
}
