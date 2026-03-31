import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import path from "path";
import { fileURLToPath } from "url";
import { auth } from "./lib/auth.js";
import { notFoundHandler, errorHandler } from "./middleware/errors.js";

// imports for future iterations
import videosRouter from "./domains/videos/videos.router.ts";
import authRouter from "./domains/auth/auth.router.ts";
// import annotationsRouter from "./domains/annotations/annotations.router.js";
// import clipsRouter from "./domains/clips/clips.router.js";
// import accountsRouter from "./domains/accounts/accounts.router.js";
// import auditRouter from "./domains/audit/audit.router.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

export function createApp() {
  const app = express();

  // middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }));

  // mount Better Auth before express.json() - it handles its own body parsing
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  // health check (no auth required)
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // domain routes for future iterations
  app.use("/domain/videos", videosRouter);
  app.use("/domain/auth", authRouter);
  // app.use("/domain/annotations", annotationsRouter);
  // app.use("/domain/clips", clipsRouter);
  // app.use("/domain/accounts", accountsRouter);
  // app.use("/domain/audit", auditRouter);

  // error handling — must be registered after all routes
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

export function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isDirectRun) {
  startServer();
}

export default app;
