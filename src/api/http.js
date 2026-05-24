import { getApiBaseUrl } from "./config.js";

export class ApiError extends Error {
  constructor(status, body, message = "API request failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Обёртка над Fetch: JSON, базовый URL, единая обработка ошибок.
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = {
    ...options.headers
  };

  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const body = response.status === 204 ? null : await parseJsonResponse(response);

  if (!response.ok) {
    const message = body && typeof body.error === "string" ? body.error : response.statusText;
    const err = new ApiError(response.status, body, message);
    if (body && typeof body.code === "string") {
      err.code = body.code;
    }
    throw err;
  }

  return body;
}
