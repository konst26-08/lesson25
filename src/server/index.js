import { env, validateEnv } from "./config/env.js";
import { createServer } from "./createServer.js";
import { createPool, closePool } from "./db/pool.js";
import { createPostgresRepositories } from "./repositories/postgres/createRepositories.js";
import { createOAuthServiceFromEnv } from "./auth/oauthService.js";
import { InternalError } from "./errors/httpErrors.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  validateEnv();

  const pool = createPool(env.databaseUrl);

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    logger.error("PostgreSQL connection failed", error);
    process.exit(1);
  }

  const repositories = createPostgresRepositories(pool);

  const app = createServer({
    ...repositories,
    jwtSecret: env.jwtSecret,
    jwtExpiresIn: env.jwtExpiresIn,
    corsOrigins: env.corsOrigins,
    oauthService: createOAuthServiceFromEnv({
      usersRepository: repositories.usersRepository,
      jwtSecret: env.jwtSecret,
      jwtExpiresIn: env.jwtExpiresIn,
      yandexOAuth: env.yandexOAuth,
      oauthFrontendSuccessUrl: env.oauthFrontendSuccessUrl
    }),
    healthCheck: async () => {
      await pool.query("SELECT 1");
    },
    getExternalServices: () => ({
      oauth:
        env.yandexOAuth.clientId && env.yandexOAuth.clientSecret ? "configured" : "not_configured"
    })
  });

  const server = app.listen(env.apiPort, () => {
    logger.info("REST API started", {
      url: `http://localhost:${env.apiPort}`,
      database: "postgresql",
      logFile: process.env.LOG_FILE?.trim() || null
    });
  });

  const shutdown = async () => {
    logger.info("Shutting down API");
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  logger.error("Failed to start API", error instanceof InternalError ? error : error);
  process.exit(1);
});
