/**
 * Next.js Instrumentation Hook with Sentry Integration
 * 
 * This file contains the server and edge runtime Sentry configuration
 * as required by Next.js 14+ for proper error monitoring.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side configuration
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime configuration
    await import('./sentry.edge.config');
  }
}