import { env, validateEnv } from "./config/env.js";
import { createServer } from "./createServer.js";
import { createPool, closePool } from "./db/pool.js";
import { createPostgresRepositories } from "./repositories/postgres/createRepositories.js";
import { createOAuthServiceFromEnv } from "./auth/oauthService.js";
import { InternalError } from "./errors/httpErrors.js";

async function startServer() {
  validateEnv();

  const pool = createPool(env.databaseUrl);

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
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
    }
  });

  const server = app.listen(env.apiPort, () => {
    console.log(`REST API started on http://localhost:${env.apiPort} (PostgreSQL)`);
  });

  const shutdown = async () => {
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error(error instanceof InternalError ? error.message : error);
  process.exit(1);
});
