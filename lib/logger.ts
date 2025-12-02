/**
 * Simple logger utility for consistent logging across the application.
 * Supports different log levels and structured logging.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel) => {
  return levels[level] >= levels[LOG_LEVEL];
};

const formatMessage = (level: LogLevel, message: string, meta?: object) => {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
};

export const logger = {
  debug: (message: string, meta?: object) => {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info: (message: string, meta?: object) => {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },
  warn: (message: string, meta?: object) => {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  error: (message: string, meta?: object) => {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
};
