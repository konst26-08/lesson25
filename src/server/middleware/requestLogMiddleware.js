import morgan from "morgan";
import { logger } from "../utils/logger.js";

/**
 * HTTP access log (self-hosted: пишет в stdout, удобно для journald / docker logs).
 * В тестах отключается (NODE_ENV=test), чтобы не засорять вывод.
 */
export function createRequestLogger() {
  if (process.env.NODE_ENV === "test" || process.env.DISABLE_HTTP_LOG === "1") {
    return (_request, _response, next) => {
      next();
    };
  }

  const format =
    process.env.LOG_HTTP_FORMAT ??
    ":remote-addr :method :url HTTP/:http-version :status :res[content-length] - :response-time ms";

  return morgan(format, {
    stream: {
      write(line) {
        logger.http(line.trim());
      }
    }
  });
}
