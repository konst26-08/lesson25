import { logger } from "../utils/logger.js";

/**
 * Структурированный HTTP access log (JSON).
 * В тестах отключается (NODE_ENV=test), чтобы не засорять вывод.
 */
export function createRequestLogger() {
  if (process.env.NODE_ENV === "test" || process.env.DISABLE_HTTP_LOG === "1") {
    return (_request, _response, next) => {
      next();
    };
  }

  return (request, response, next) => {
    const startedAt = Date.now();

    response.on("finish", () => {
      logger.http("HTTP request", {
        method: request.method,
        path: request.originalUrl ?? request.url,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
        ip: request.ip,
        userAgent: request.get("user-agent") ?? null,
        contentLength: response.get("content-length") ?? null
      });
    });

    next();
  };
}
