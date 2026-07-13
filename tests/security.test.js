const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeString, validatePayload, redactSecrets } = require('../scripts/security-helpers');

test('sanitizes control characters from user input', () => {
  assert.equal(sanitizeString('  hello\nworld\u0000  '), 'hello\nworld');
});

test('rejects payloads with too many fields', () => {
  const payload = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`field${index}`, index]));
  const result = validatePayload(payload, { maxKeys: 50 });
  assert.equal(result.valid, false);
  assert.match(result.error, /too many fields/i);
});

test('redacts secrets before logging', () => {
  const value = JSON.stringify({ token: 'abc123', password: 'super-secret' });
  const redacted = redactSecrets(value);
  assert.match(redacted, /\[redacted\]/);
  assert.doesNotMatch(redacted, /super-secret/);
});
