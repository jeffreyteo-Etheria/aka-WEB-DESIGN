const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_DIR = path.join(__dirname, '..', 'monitoring');
const SECRET_KEYS = ['token', 'secret', 'password', 'passwd', 'authorization', 'api_key', 'apikey'];

function sanitizeString(value, maxLength = 2000) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const cleaned = value.replace(/[\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u000b\u000c\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f\u007f]/g, '').trim();
    return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
  }
  return String(value).replace(/[\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u000b\u000c\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f\u007f]/g, '').trim();
}

/* maxStringLength defaults to 500 for the LOG callers (audit/security log
   lines, where truncation is the point). Payload validation passes its own,
   much larger limit — see validatePayload. */
function sanitizeObject(value, depth = 0, redact = true, maxStringLength = 500) {
  if (depth > 3) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeObject(item, depth + 1, redact, maxStringLength));
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entryValue]) => {
      const normalizedKey = key.toLowerCase();
      if (redact && SECRET_KEYS.some((secretKey) => normalizedKey.includes(secretKey))) {
        acc[key] = '[redacted]';
      } else {
        acc[key] = sanitizeObject(entryValue, depth + 1, redact, maxStringLength);
      }
      return acc;
    }, {});
  }
  // Booleans/numbers/null must survive as their real type — stringifying
  // `false` into the string "false" made every content-type's "Featured"/
  // "Active" checkbox stick permanently on: callers coerce with `!!value`,
  // and a non-empty string is always truthy, so `!!"false"` is `true`.
  // Once a checkbox was ever unchecked and saved, it could never go back.
  if (typeof value === 'boolean' || typeof value === 'number' || value === null) return value;
  return sanitizeString(value, maxStringLength);
}

function redactSecrets(value) {
  if (!value) return value;
  const source = typeof value === 'string' ? value : JSON.stringify(value);
  const redacted = source
    .replace(/(Bearer\s+)([A-Za-z0-9._-]+)/gi, '$1[redacted]')
    .replace(/(["']?)(token|password|passwd|secret|api[_-]?key)\1(\s*[:=]\s*)(["']?)([^"'\s,;]+)/gi, (_match, quoteStart, keyName, separator, quoteValue) => {
      return `${quoteStart}${keyName}${quoteStart}${separator}${quoteValue || ''}[redacted]`;
    });
  return redacted;
}

function validatePayload(payload, { maxKeys = 50, maxStringLength = 50000, allowArray = false } = {}) {
  if (payload === null || payload === undefined) {
    return { valid: true, value: {} };
  }

  if (allowArray && Array.isArray(payload)) {
    return { valid: true, value: payload.slice(0, 50) };
  }

  if (typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }

  const entries = Object.entries(payload);
  if (entries.length > maxKeys) {
    return { valid: false, error: 'Payload has too many fields' };
  }

  for (const [key, value] of entries) {
    if (typeof value === 'string' && value.length > maxStringLength) {
      return { valid: false, error: `Field ${key} exceeds allowed length` };
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = validatePayload(value, { maxKeys: 20, maxStringLength, allowArray: false });
      if (!nested.valid) return nested;
    }
  }

  /* Pass the payload's own string limit through — the default 500-char
     log-line cap was silently amputating every article body at 500 chars,
     while this function's own length check above promised 50000. */
  return { valid: true, value: sanitizeObject(payload, 0, false, maxStringLength) };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || '';
  return String(forwarded).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs = 60000, maxRequests = 20 } = {}) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    const bucket = buckets.get(key) || [];
    const active = bucket.filter((timestamp) => timestamp > now - windowMs);
    active.push(now);
    buckets.set(key, active);

    if (active.length > maxRequests) {
      return { allowed: false, remaining: 0, resetAt: active[0] + windowMs };
    }

    return { allowed: true, remaining: maxRequests - active.length, resetAt: now + windowMs };
  };
}

function ensureLogDir(logDir = DEFAULT_LOG_DIR) {
  fs.mkdirSync(logDir, { recursive: true });
  return logDir;
}

function appendAuditLog(event, details, logDir = DEFAULT_LOG_DIR) {
  const directory = ensureLogDir(logDir);
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    details: sanitizeObject(details),
  }) + '\n';
  fs.appendFileSync(path.join(directory, 'audit.log'), line);
}

function appendSecurityLog(event, details, logDir = DEFAULT_LOG_DIR) {
  const directory = ensureLogDir(logDir);
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    details: sanitizeObject(details),
  }) + '\n';
  fs.appendFileSync(path.join(directory, 'security-events.log'), line);
}

function getSecurityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store, max-age=0',
    ...extra,
  };
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  redactSecrets,
  validatePayload,
  getClientIp,
  createRateLimiter,
  ensureLogDir,
  appendAuditLog,
  appendSecurityLog,
  getSecurityHeaders,
};
