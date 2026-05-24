/**
 * Базовая ошибка API с HTTP-кодом и опциональным машинным кодом для клиента.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {{ code?: string, details?: string[] }} [options]
   */
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code ?? undefined;
    this.details = options.details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request.", details) {
    super(400, message, { code: "BAD_REQUEST", details });
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(401, message, { code: "UNAUTHORIZED" });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden: insufficient permissions.") {
    super(403, message, { code: "FORBIDDEN" });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(404, message, { code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict.") {
    super(409, message, { code: "CONFLICT" });
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  /**
   * @param {string[]} details
   */
  constructor(details) {
    super(422, "Validation failed.", { code: "VALIDATION_FAILED", details });
    this.name = "ValidationError";
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error.") {
    super(500, message, { code: "INTERNAL_ERROR" });
    this.name = "InternalError";
  }
}
