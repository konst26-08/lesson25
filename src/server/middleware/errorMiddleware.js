import { AppError } from "../errors/httpErrors.js";
import { logger } from "../utils/logger.js";

function isInvalidJsonBodyError(error) {
  if (!error) {
    return false;
  }
  if (error.type === "entity.parse.failed") {
    return true;
  }
  return error instanceof SyntaxError && typeof error.status === "number" && error.status === 400;
}

/**
 * Централизованная обработка ошибок: валидация, доступ, сеть/500.
 */
export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const path = request.originalUrl ?? request.url;
  const method = request.method;

  if (isInvalidJsonBodyError(error)) {
    logger.warn("Invalid JSON body", { method, path });
    response.status(400).json({
      error: "Invalid JSON in request body.",
      code: "INVALID_JSON"
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(`API ${error.statusCode}`, error);
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      logger.warn(`API ${error.statusCode}`, {
        method,
        path,
        code: error.code,
        detail: error.message
      });
    } else if (error.statusCode === 422) {
      logger.info("Validation failed", { method, path, details: error.details });
    } else {
      logger.info(`API ${error.statusCode}`, { method, path, detail: error.message });
    }

    const body = {
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(Array.isArray(error.details) && error.details.length > 0
        ? { details: error.details }
        : {})
    };
    response.status(error.statusCode).json(body);
    return;
  }

  if (error.message === "CORS blocked for this origin.") {
    logger.warn("CORS blocked", { method, path, origin: request.headers.origin });
    response.status(403).json({
      error: "Origin is not allowed by CORS policy.",
      code: "CORS_FORBIDDEN"
    });
    return;
  }

  logger.error("Unhandled error", error);
  const isProd = process.env.NODE_ENV === "production";
  response.status(500).json({
    error: isProd ? "Internal server error." : error.message,
    code: "INTERNAL_ERROR"
  });
}
