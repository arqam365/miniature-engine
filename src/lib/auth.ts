// better-auth is ESM-only. TypeScript CJS mode compiles `import()` to `require()` which
// fails for ESM. We use `new Function` to preserve a native dynamic import, and resolve
// the absolute path via require.resolve + pathToFileURL so the import context is correct.

// Static require hints — makes Vercel's bundler include these packages in the Lambda.
// ERR_REQUIRE_ESM is expected and silently swallowed; we load them via dynamic import below.
/* eslint-disable @typescript-eslint/no-require-imports */
try { require('better-auth'); } catch {}
try { require('better-auth/adapters/prisma'); } catch {}
try { require('better-auth/plugins'); } catch {}
/* eslint-enable */

import * as urlLib from 'url';
import { PrismaClient } from '@prisma/client';

const esmImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;

function esmLoad(pkg: string): Promise<any> {
  // require.resolve gives the absolute filesystem path even for ESM-only packages
  const resolved = require.resolve(pkg);
  return esmImport(urlLib.pathToFileURL(resolved).href);
}

const prisma = new PrismaClient();

let _auth: any;
let _initPromise: Promise<void> | null = null;

function initAuth(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const { betterAuth } = await esmLoad('better-auth');
    const { prismaAdapter } = await esmLoad('better-auth/adapters/prisma');
    const { bearer } = await esmLoad('better-auth/plugins');

    _auth = betterAuth({
      database: prismaAdapter(prisma, { provider: 'postgresql' }),
      baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
      secret: process.env.BETTER_AUTH_SECRET ?? 'fallback-secret-change-in-production',
      trustedOrigins: [
        'http://localhost:3000',
        ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
      ],
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
  })();
  return _initPromise;
}

// Pre-warm on module load so the first request isn't cold.
initAuth().catch((e) => console.error('[auth] init failed:', e));

export async function getAuth(): Promise<any> {
  await initAuth();
  return _auth;
}
