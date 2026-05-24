import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createInMemoryProductsRepository } from "./repositories/inMemoryProductsRepository.js";
import { createInMemoryUsersRepository } from "./repositories/inMemoryUsersRepository.js";
import { createInMemoryOrdersRepository } from "./repositories/inMemoryOrdersRepository.js";
import { validateCreateProduct, validateUpdateProduct } from "./validation/productsValidation.js";
import { validateLoginPayload, validateRegisterPayload } from "./validation/authValidation.js";
import {
  normalizeCreateOrderPayload,
  validateCreateOrderPayload,
  isValidOrderNumber
} from "./validation/ordersValidation.js";
import { requireAuth, requireRole } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { createRequestLogger } from "./middleware/requestLogMiddleware.js";
import {
  createAuthRateLimiter,
  createSecurityMiddleware
} from "./middleware/securityMiddleware.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "./errors/httpErrors.js";
import { createOAuthServiceFromEnv } from "./auth/oauthService.js";
import { createHealthHandlers } from "./health/healthHandlers.js";

const defaultProducts = [
  { id: 1, name: "Racer Pro", price: 10990, sport: "running", brand: "StepUp", isActive: true },
  { id: 2, name: "Gym Flex", price: 8990, sport: "gym", brand: "Bold Sport", isActive: true },
  { id: 3, name: "Fit Core Pro", price: 9490, sport: "fitness", brand: "StepUp", isActive: true },
  { id: 4, name: "City Walk Lite", price: 7990, sport: "casual", brand: "StepUp", isActive: true }
];

const sportsCatalog = [
  { id: "running", label: "Бег" },
  { id: "gym", label: "Зал" },
  { id: "fitness", label: "Фитнес" },
  { id: "casual", label: "Повседневная" }
];

const defaultOrders = [
  {
    id: 1,
    orderNumber: "SU-120001",
    userId: 1,
    createdAt: "2026-04-19",
    status: "Передан в доставку",
    total: 12990,
    trackingNumber: "RU123456789",
    items: [{ productName: "Racer Pro (42)", quantity: 1, unitPrice: 10990 }]
  },
  {
    id: 2,
    orderNumber: "SU-120002",
    userId: 1,
    createdAt: "2026-04-16",
    status: "Оплачен",
    total: 8990,
    trackingNumber: null,
    items: [{ productName: "Gym Flex (40)", quantity: 1, unitPrice: 8990 }]
  }
];

function createDefaultSportsRepository() {
  return {
    list: async () => sportsCatalog
  };
}

function toIntId(rawId) {
  const parsed = Number.parseInt(rawId, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function generateOrderNumber() {
  const suffix = String(Math.floor(100000 + Math.random() * 900000));
  return `SU-${suffix}`;
}

function createCorsOptions(corsOrigins) {
  if (!corsOrigins || corsOrigins.length === 0) {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS blocked for this origin."));
    }
  };
}

export function createServer({
  repository = createInMemoryProductsRepository(defaultProducts),
  usersRepository = createInMemoryUsersRepository(),
  ordersRepository = createInMemoryOrdersRepository(defaultOrders),
  sportsRepository = createDefaultSportsRepository(),
  jwtSecret = "dev_jwt_secret_dev_jwt_secret_12345",
  jwtExpiresIn = "1d",
  corsOrigins = [],
  healthCheck = null,
  getExternalServices = () => ({}),
  oauthService = null
} = {}) {
  const app = express();
  const authRequired = requireAuth({ jwtSecret, usersRepository });
  const authRateLimiter = createAuthRateLimiter();
  const resolvedOAuthService =
    oauthService ??
    createOAuthServiceFromEnv({
      usersRepository,
      jwtSecret,
      jwtExpiresIn,
      yandexOAuth: {
        clientId: process.env.YANDEX_OAUTH_CLIENT_ID ?? "",
        clientSecret: process.env.YANDEX_OAUTH_CLIENT_SECRET ?? "",
        redirectUri: process.env.YANDEX_OAUTH_REDIRECT_URI ?? ""
      },
      oauthFrontendSuccessUrl: process.env.OAUTH_FRONTEND_SUCCESS_URL ?? ""
    });

  app.use(createRequestLogger());
  app.use(...createSecurityMiddleware());
  app.use(cors(createCorsOptions(corsOrigins)));
  app.use(express.json({ limit: "100kb" }));

  const healthHandlers = createHealthHandlers({ healthCheck, getExternalServices });
  app.get("/api/health/live", healthHandlers.live);
  app.get("/api/health/ready", asyncHandler(healthHandlers.ready));
  app.get("/api/health", asyncHandler(healthHandlers.health));

  app.get(
    "/api/sports",
    asyncHandler(async (_request, response) => {
      const data = await sportsRepository.list();
      response.status(200).json({ data });
    })
  );

  app.post(
    "/api/auth/register",
    authRateLimiter,
    asyncHandler(async (request, response, next) => {
      const errors = validateRegisterPayload(request.body);
      if (errors.length > 0) {
        return next(new ValidationError(errors));
      }

      const normalizedEmail = request.body.email.trim().toLowerCase();
      const existingUser = await usersRepository.findByEmail(normalizedEmail);
      if (existingUser) {
        return next(new ConflictError("User with this email already exists."));
      }

      const passwordHash = await bcrypt.hash(request.body.password, 10);
      const createdUser = await usersRepository.create({
        email: normalizedEmail,
        passwordHash,
        role: "user"
      });

      const token = jwt.sign({ role: createdUser.role }, jwtSecret, {
        subject: String(createdUser.id),
        expiresIn: jwtExpiresIn,
        algorithm: "HS256"
      });

      return response.status(201).json({
        data: {
          user: {
            id: createdUser.id,
            email: createdUser.email,
            role: createdUser.role
          },
          token
        }
      });
    })
  );

  app.post(
    "/api/auth/login",
    authRateLimiter,
    asyncHandler(async (request, response, next) => {
      const errors = validateLoginPayload(request.body);
      if (errors.length > 0) {
        return next(new ValidationError(errors));
      }

      const normalizedEmail = request.body.email.trim().toLowerCase();
      const user = await usersRepository.findByEmail(normalizedEmail);
      if (!user) {
        return next(new UnauthorizedError("Invalid email or password."));
      }

      if (!user.passwordHash) {
        return next(new UnauthorizedError("Invalid email or password."));
      }

      const isValidPassword = await bcrypt.compare(request.body.password, user.passwordHash);
      if (!isValidPassword) {
        return next(new UnauthorizedError("Invalid email or password."));
      }

      const token = jwt.sign({ role: user.role }, jwtSecret, {
        subject: String(user.id),
        expiresIn: jwtExpiresIn,
        algorithm: "HS256"
      });

      return response.status(200).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    })
  );

  app.get(
    "/api/auth/me",
    authRequired,
    asyncHandler(async (request, response) => {
      const user = await usersRepository.findById(request.auth.userId);
      return response.status(200).json({
        data: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    })
  );

  if (resolvedOAuthService) {
    app.get("/api/auth/yandex", authRateLimiter, (request, response) => {
      const { url } = resolvedOAuthService.startYandexAuthorization();
      response.redirect(url);
    });

    app.get(
      "/api/auth/yandex/callback",
      authRateLimiter,
      asyncHandler(async (request, response) => {
        const providerError = request.query.error;
        if (providerError) {
          response.redirect(
            resolvedOAuthService.buildFrontendRedirect({
              error: String(providerError)
            })
          );
          return;
        }

        const code = request.query.code;
        const state = request.query.state;
        if (typeof code !== "string" || typeof state !== "string") {
          response.redirect(
            resolvedOAuthService.buildFrontendRedirect({
              error: "invalid_request"
            })
          );
          return;
        }

        try {
          const authResult = await resolvedOAuthService.completeYandexAuthorization(code, state);
          response.redirect(
            resolvedOAuthService.buildFrontendRedirect({
              token: authResult.token
            })
          );
        } catch {
          response.redirect(
            resolvedOAuthService.buildFrontendRedirect({
              error: "oauth_failed"
            })
          );
        }
      })
    );
  }

  app.get(
    "/api/products",
    asyncHandler(async (_request, response) => {
      const data = await repository.list();
      response.status(200).json({ data });
    })
  );

  app.get(
    "/api/products/:id",
    asyncHandler(async (request, response, next) => {
      const id = toIntId(request.params.id);
      if (id === null) {
        return next(new BadRequestError("Invalid product id."));
      }

      const product = await repository.findById(id);
      if (!product) {
        return next(new NotFoundError("Product not found."));
      }

      return response.status(200).json({ data: product });
    })
  );

  app.post(
    "/api/products",
    authRequired,
    requireRole("admin"),
    asyncHandler(async (request, response, next) => {
      const errors = validateCreateProduct(request.body);
      if (errors.length > 0) {
        return next(new ValidationError(errors));
      }

      const created = await repository.create(request.body);
      if (!created) {
        return next(new BadRequestError("Sport or brand not found for product."));
      }
      return response.status(201).json({ data: created });
    })
  );

  app.put(
    "/api/products/:id",
    authRequired,
    requireRole("admin"),
    asyncHandler(async (request, response, next) => {
      const id = toIntId(request.params.id);
      if (id === null) {
        return next(new BadRequestError("Invalid product id."));
      }

      const errors = validateUpdateProduct(request.body ?? {});
      if (errors.length > 0) {
        return next(new ValidationError(errors));
      }

      const updated = await repository.update(id, request.body);
      if (!updated) {
        return next(new NotFoundError("Product not found."));
      }

      return response.status(200).json({ data: updated });
    })
  );

  app.delete(
    "/api/products/:id",
    authRequired,
    requireRole("admin"),
    asyncHandler(async (request, response, next) => {
      const id = toIntId(request.params.id);
      if (id === null) {
        return next(new BadRequestError("Invalid product id."));
      }

      const removed = await repository.remove(id);
      if (!removed) {
        return next(new NotFoundError("Product not found."));
      }

      return response.status(204).send();
    })
  );

  app.get(
    "/api/orders",
    authRequired,
    asyncHandler(async (request, response) => {
      const orders = await ordersRepository.listByUserId(request.auth.userId);
      return response.status(200).json({ data: orders });
    })
  );

  app.post(
    "/api/orders",
    authRequired,
    asyncHandler(async (request, response, next) => {
      const errors = validateCreateOrderPayload(request.body);
      if (errors.length > 0) {
        return next(new ValidationError(errors));
      }

      const orderPayload = normalizeCreateOrderPayload(request.body);

      const created = await ordersRepository.create({
        orderNumber: generateOrderNumber(),
        userId: request.auth.userId,
        status: "Оплачен",
        items: orderPayload.items,
        contacts: orderPayload.contacts,
        address: orderPayload.address
      });

      return response.status(201).json({ data: created });
    })
  );

  app.get(
    "/api/orders/:orderNumber",
    authRequired,
    asyncHandler(async (request, response, next) => {
      if (!isValidOrderNumber(request.params.orderNumber)) {
        return next(new BadRequestError("Invalid order number format."));
      }

      const order = await ordersRepository.findByOrderNumber(
        request.params.orderNumber,
        request.auth.userId
      );
      if (!order) {
        return next(new NotFoundError("Order not found."));
      }

      return response.status(200).json({ data: order });
    })
  );

  app.use((_request, _response, next) => {
    next(new NotFoundError("Route not found."));
  });

  app.use(errorHandler);

  return app;
}
