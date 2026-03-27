import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

// imports for future iterations
import videosRouter from "./domains/videos/videos.router.ts";
import authRouter from "./domains/auth/auth.router.ts";
// import annotationsRouter from "./domains/annotations/annotations.router.js";
// import clipsRouter from "./domains/clips/clips.router.js";
// import accountsRouter from "./domains/accounts/accounts.router.js";
// import auditRouter from "./domains/audit/audit.router.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});