import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../errors/httpErrors.js";

function extractBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function requireAuth({ jwtSecret, usersRepository }) {
  return async (request, response, next) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return next(new UnauthorizedError("Authentication required."));
    }

    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
      const user = await usersRepository.findById(payload.sub);

      if (!user) {
        return next(new UnauthorizedError("Invalid auth token."));
      }

      request.auth = {
        userId: user.id,
        role: user.role
      };
      return next();
    } catch (error) {
      if (error && (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError")) {
        return next(new UnauthorizedError("Invalid auth token."));
      }
      return next(error);
    }
  };
}

export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return next(new ForbiddenError("Forbidden: insufficient permissions."));
    }
    return next();
  };
}
