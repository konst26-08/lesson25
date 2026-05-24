import fs from "node:fs";
import path from "node:path";

/**
 * Структурированный JSON-логгер для API (stdout + опционально файл).
 * Каждая строка — один JSON-объект (JSONL), удобно для grep, jq и AI-анализа.
 */

export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  warning: 1,
  info: 2,
  http: 3,
  debug: 4
};

const SERVICE_NAME = process.env.LOG_SERVICE ?? "stepup-api";

function resolveMinLevel() {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return LOG_LEVELS[raw] ?? LOG_LEVELS.info;
}

function defaultLogFilePath() {
  return process.env.LOG_FILE?.trim() || "";
}

function ensureLogDirectory(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createStdoutSink() {
  return (entry) => {
    const line = JSON.stringify(entry);
    if (entry.level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  };
}

function createFileSink(filePath) {
  if (!filePath) {
    return null;
  }

  ensureLogDirectory(filePath);

  return (entry) => {
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  };
}

let minLevel = resolveMinLevel();
let sinks = buildDefaultSinks();

function buildDefaultSinks() {
  const next = [createStdoutSink()];
  const fileSink = createFileSink(defaultLogFilePath());
  if (fileSink) {
    next.push(fileSink);
  }
  return next;
}

function shouldLog(level) {
  const numeric = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  return numeric <= minLevel;
}

function writeLog(level, message, meta = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    ...meta,
    message
  };

  for (const sink of sinks) {
    sink(entry);
  }

  return entry;
}

export const logger = {
  error(message, errOrMeta) {
    if (errOrMeta instanceof Error) {
      return writeLog("error", message, {
        err: errOrMeta.message,
        stack: errOrMeta.stack,
        name: errOrMeta.name
      });
    }
    if (errOrMeta && typeof errOrMeta === "object") {
      return writeLog("error", message, errOrMeta);
    }
    if (errOrMeta !== undefined) {
      return writeLog("error", message, { detail: String(errOrMeta) });
    }
    return writeLog("error", message);
  },

  warn(message, meta = {}) {
    return writeLog("warn", message, meta);
  },

  /** Алиас для warn (info / warning / error). */
  warning(message, meta = {}) {
    return writeLog("warn", message, meta);
  },

  info(message, meta = {}) {
    return writeLog("info", message, meta);
  },

  http(message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "http",
      service: SERVICE_NAME,
      ...(typeof meta === "string" ? { raw: meta } : meta),
      message
    };

    for (const sink of sinks) {
      sink(entry);
    }

    return entry;
  },

  debug(message, meta = {}) {
    return writeLog("debug", message, meta);
  }
};

/** Только для unit-тестов: подмена sinks и порога уровня. */
export function configureLoggerForTests(options = {}) {
  if (options.minLevel !== undefined) {
    minLevel = options.minLevel;
  }
  if (options.sinks) {
    sinks = options.sinks;
  }
}

export function resetLoggerForTests() {
  minLevel = resolveMinLevel();
  sinks = buildDefaultSinks();
}

export function getLoggerConfig() {
  return {
    minLevel,
    sinkCount: sinks.length,
    logFile: defaultLogFilePath() || null,
    service: SERVICE_NAME
  };
}
