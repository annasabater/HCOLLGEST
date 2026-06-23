import * as Sentry from '@sentry/nextjs';

// S'activa NOMÉS si hi ha DSN configurat (sense DSN, és un no-op).
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
