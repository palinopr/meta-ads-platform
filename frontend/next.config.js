const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['scontent.xx.fbcdn.net', 'graph.facebook.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  experimental: {
    instrumentationHook: true,
  },
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  
  // Suppresses source map uploading logs during build
  hideSourceMaps: true,
  
  // Disable source maps upload in development
  disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
  disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
  
  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: '/monitoring',
  
  // Hides source maps from generated client bundles
  hideSourceMaps: true,
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  
  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
}

// Export the configuration with Sentry integration
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);