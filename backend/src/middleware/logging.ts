import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

/**
 * HTTP request logging middleware powered by pino-http.
 *
 * @description Logs every incoming request with method, URL, status code,
 * and response time. Uses the shared pino logger so all output goes through
 * a single configured instance. Register this before all other middleware
 * so every request is captured.
 */
export const requestLogger = pinoHttp({
  logger,
  customLogLevel(_req, res, err) {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
});
