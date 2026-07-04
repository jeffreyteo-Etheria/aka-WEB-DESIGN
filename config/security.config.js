module.exports = {
  environment: process.env.NODE_ENV || 'production',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 1800000),
  maxPayloadSizeBytes: 1024 * 1024,
  rateLimits: {
    login: { windowMs: 60000, maxRequests: 10 },
    api: { windowMs: 60000, maxRequests: 120 },
  },
};
