import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

// configure Better Auth instance
// this is the core auth engine that handles sessions, sign-in, and password hashing
export const auth = betterAuth({
  // use Prisma as the database adapter for storing users, sessions, accounts
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // enable email/password authentication
  // disableSignUp: true means users can only be created via our invite flow
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },

  // allow requests from the frontend origin for CORS
  trustedOrigins: [process.env.ALLOWED_ORIGIN || "http://localhost:5173"],
});
