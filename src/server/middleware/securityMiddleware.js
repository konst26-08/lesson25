import helmet from "helmet";
import rateLimit from "express-rate-limit";

function isTestEnv() {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

export function createSecurityMiddleware() {
  const middlewares = [
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  ];

  if (!isTestEnv()) {
    middlewares.push(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many requests.", code: "RATE_LIMITED" }
      })
    );
  }

  return middlewares;
}

export function createAuthRateLimiter() {
  if (isTestEnv()) {
    return (_request, _response, next) => next();
  }

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts.", code: "RATE_LIMITED" }
  });
}
