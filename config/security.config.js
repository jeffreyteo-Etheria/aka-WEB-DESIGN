module.exports = {
  environment: process.env.NODE_ENV || 'production',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  /* 8h sliding window (extended on every authenticated request). The old
     30-minute fixed TTL expired mid-editing-session — writing one article
     takes longer than that, so Save would bounce editors to the login page
     and lose their work. */
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 8 * 60 * 60 * 1000),
  maxPayloadSizeBytes: 1024 * 1024,
  rateLimits: {
    login: { windowMs: 60000, maxRequests: 10 },
    api: { windowMs: 60000, maxRequests: 120 },
  },
};
