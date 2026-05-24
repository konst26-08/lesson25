const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";
const YANDEX_PROFILE_URL = "https://login.yandex.ru/info?format=json";

export function createYandexOAuthClient({
  clientId,
  clientSecret,
  redirectUri,
  fetchImpl = fetch
}) {
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Yandex OAuth client requires clientId, clientSecret, and redirectUri.");
  }

  return {
    buildAuthorizationUrl(state) {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state
      });
      return `${YANDEX_AUTHORIZE_URL}?${params.toString()}`;
    },

    async exchangeCodeForToken(code) {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret
      });

      const response = await fetchImpl(YANDEX_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.access_token) {
        const message = payload.error_description || payload.error || "Token exchange failed.";
        throw new Error(message);
      }

      return payload.access_token;
    },

    async fetchUserProfile(accessToken) {
      const response = await fetchImpl(YANDEX_PROFILE_URL, {
        headers: { Authorization: `OAuth ${accessToken}` }
      });

      const profile = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = profile.error_description || profile.error || "Profile fetch failed.";
        throw new Error(message);
      }

      return profile;
    }
  };
}

export function extractYandexEmail(profile) {
  if (typeof profile?.default_email === "string" && profile.default_email.trim()) {
    return profile.default_email.trim().toLowerCase();
  }

  if (Array.isArray(profile?.emails) && profile.emails[0]) {
    return String(profile.emails[0]).trim().toLowerCase();
  }

  return null;
}

export function extractYandexDisplayName(profile) {
  if (typeof profile?.real_name === "string" && profile.real_name.trim()) {
    return profile.real_name.trim();
  }

  const parts = [profile?.first_name, profile?.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim());

  if (parts.length > 0) {
    return parts.join(" ");
  }

  if (typeof profile?.login === "string" && profile.login.trim()) {
    return profile.login.trim();
  }

  return null;
}
