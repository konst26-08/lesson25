/**
 * Простой логгер для self-hosted: stdout + уровни (без внешних зависимостей).
 * В production при необходимости перенаправьте stdout в файл или journald.
 */

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const currentLevel = LEVELS[envLevel] ?? LEVELS.info;

function ts() {
  return new Date().toISOString();
}

function logLine(level, message, meta) {
  const payload = { ts: ts(), level, message, ...meta };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  error(message, err) {
    if (currentLevel < LEVELS.error) {
      return;
    }
    const meta =
      err instanceof Error ? { err: err.message, stack: err.stack } : { err: String(err) };
    logLine("error", message, meta);
  },

  warn(message, meta = {}) {
    if (currentLevel < LEVELS.warn) {
      return;
    }
    logLine("warn", message, meta);
  },

  info(message, meta = {}) {
    if (currentLevel < LEVELS.info) {
      return;
    }
    logLine("info", message, meta);
  },

  /**
   * Access-логи всегда пишутся в stdout (удобно для docker logs / journald).
   * Уровень LOG_LEVEL на них не влияет.
   */
  http(message) {
    console.log(`${ts()} [http] ${message.trim()}`);
  }
};
