/**
 * Базовый URL backend API.
 * В dev с прокси Vite можно оставить пустым — запросы идут на тот же origin (`/api/...`).
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || raw === "") {
    return "";
  }
  return String(raw).replace(/\/$/, "");
}

/**
 * URL старта OAuth (редирект на backend).
 */
export function getOAuthStartUrl(provider) {
  const base = getApiBaseUrl();
  const origin =
    base || (typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "");
  return `${origin}/api/auth/${provider}`;
}
