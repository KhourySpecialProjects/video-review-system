import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// imports for future iterations
import videosRouter from "./domains/videos/videos.router.js";
// import authRouter from "./domains/auth/auth.router.js";
// import annotationsRouter from "./domains/annotations/annotations.router.js";
// import clipsRouter from "./domains/clips/clips.router.js";
// import accountsRouter from "./domains/accounts/accounts.router.js";
// import auditRouter from "./domains/audit/audit.router.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors({
  origin: "*", // allow all origins (for development only, consider restricting in production)
  methods: ["GET", "POST", "PUT", "DELETE"], // allow these HTTP methods
}));
app.use(express.json());

// health check (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// domain routes for future iterations
app.use("/domain/videos", videosRouter);
// app.use("/domain/auth", authRouter);
// app.use("/domain/annotations", annotationsRouter);
// app.use("/domain/clips", clipsRouter);
// app.use("/domain/accounts", accountsRouter);
// app.use("/domain/audit", auditRouter);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});