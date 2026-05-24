import dotenv from "dotenv";

dotenv.config();

function parseCorsOrigins(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const jwtSecret = process.env.JWT_SECRET ?? "";

export const env = {
  apiPort: Number.parseInt(process.env.API_PORT ?? "3001", 10),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  corsOrigins: parseCorsOrigins(process.env.API_CORS_ORIGINS),
  yandexOAuth: {
    clientId: process.env.YANDEX_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.YANDEX_OAUTH_CLIENT_SECRET ?? "",
    redirectUri: process.env.YANDEX_OAUTH_REDIRECT_URI ?? ""
  },
  oauthFrontendSuccessUrl: process.env.OAUTH_FRONTEND_SUCCESS_URL ?? ""
};

export function validateEnv() {
  const errors = [];

  if (env.jwtSecret.length < 32) {
    errors.push("JWT_SECRET must be set and at least 32 characters long.");
  }

  if (!Number.isFinite(env.apiPort) || env.apiPort < 1) {
    errors.push("API_PORT must be a valid port number.");
  }

  if (!env.databaseUrl) {
    errors.push("DATABASE_URL must be set (PostgreSQL connection string).");
  }

  if (process.env.NODE_ENV === "production" && env.corsOrigins.length === 0) {
    errors.push("API_CORS_ORIGINS must be set in production (comma-separated allowed origins).");
  }

  if (errors.length > 0) {
    throw new Error(`Environment configuration error: ${errors.join(" ")}`);
  }
}
