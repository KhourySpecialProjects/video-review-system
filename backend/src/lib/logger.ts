import pino from "pino";

const isDev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

/**
 * Shared application logger powered by pino.
 *
 * @description In production, outputs structured JSON lines. In development,
 * uses pino-pretty for colored, human-readable output. Import this wherever
 * you need to log outside of HTTP request context (startup, background jobs,
 * error handlers). For request-scoped logging, use `req.log` from pino-http.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: {
      target: "pino-pretty",
    },
  }),
});
