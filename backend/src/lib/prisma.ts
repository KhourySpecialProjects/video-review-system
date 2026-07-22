import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let connectionString: string;

if (process.env.NODE_ENV == "production") {
  connectionString = process.env["DIRECT_DATABASE_URL"]!;
} else if (process.env.LOCAL == "true") {
  connectionString = process.env["LOCAL_DATABASE_URL"]!;
} else {
  connectionString = process.env["RDS_SESSION_MANAGER_DATABASE_URL"]!;
}

logger.info(
  { db: connectionString.replace(/:[^:]+@/, ":***@") },
  "database connection configured",
);

// create postgres connection pool
const pool = new pg.Pool({
  connectionString: connectionString,
  // Local Postgres (Docker) doesn't speak SSL; RDS requires it. When running
  // fully local (LOCAL=true) disable SSL, otherwise bypass the strict CA check.
  ssl: process.env.LOCAL === "true" ? false : { rejectUnauthorized: false },
});

// create prisma client with pg adapter (required in Prisma 7)
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
