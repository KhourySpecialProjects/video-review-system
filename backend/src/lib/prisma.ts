import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// create postgres connection pool
const pool = new pg.Pool({
  connectionString: process.env.DIRECT_DATABASE_URL,
});

// create prisma client with pg adapter (required in Prisma 7)
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
