import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  secret: process.env.BETTER_AUTH_SECRET ?? 'fallback-secret-change-in-production',
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
  basePath: '/api/v1/auth',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false, defaultValue: '' },
      lastName: { type: 'string', required: false, defaultValue: '' },
      organizationId: { type: 'string', required: false, defaultValue: '' },
      isSuperAdmin: { type: 'boolean', defaultValue: false },
      isActive: { type: 'boolean', defaultValue: true },
    },
  },
  account: {
    modelName: 'authAccount',
  },
  plugins: [bearer()],
});

export type Auth = typeof auth;
