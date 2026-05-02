import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.ts";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "AGENT",
        input: false,
      },
    },
  },
});
