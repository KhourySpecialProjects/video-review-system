import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    database: new Pool({
        connectionString: process.env.DATABASE_URL!,
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        process.env.APP_URL || "https://localhost:5173",
    ],
});
