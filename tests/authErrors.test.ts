import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toFriendlyAuthError } from '../src/lib/authErrors';

test('maps an expired OTP', () => {
  const r = toFriendlyAuthError({ message: 'Token has expired or is invalid', status: 401 });
  assert.equal(r.kind, 'expired_otp');
  assert.match(r.message, /expired/i);
});

test('maps an invalid OTP', () => {
  const r = toFriendlyAuthError({ message: 'Invalid token', status: 401 });
  assert.equal(r.kind, 'invalid_otp');
});

test('maps rate limiting and keeps the retry hint', () => {
  const r = toFriendlyAuthError({
    message: 'For security purposes, you can only request this after 47 seconds.',
    status: 429
  });
  assert.equal(r.kind, 'rate_limited');
  assert.match(r.message, /47 seconds/);
});

test('maps rate limiting without a retry hint', () => {
  const r = toFriendlyAuthError({ message: 'Request rate limit reached', status: 429 });
  assert.equal(r.kind, 'rate_limited');
});

test('maps network failures', () => {
  for (const message of ['Failed to fetch', 'NetworkError when attempting to fetch', 'Load failed']) {
    assert.equal(toFriendlyAuthError(new TypeError(message)).kind, 'network', message);
  }
});

test('maps Supabase 5xx as a temporary outage', () => {
  const r = toFriendlyAuthError({ message: 'Internal Server Error', status: 503 });
  assert.equal(r.kind, 'network');
  assert.match(r.message, /temporarily unavailable/i);
});

test('maps an unknown user', () => {
  const r = toFriendlyAuthError({ message: 'Signups not allowed for otp', status: 422 });
  assert.equal(r.kind, 'user_not_found');
});

test('maps an unconfirmed email', () => {
  assert.equal(toFriendlyAuthError({ message: 'Email not confirmed' }).kind, 'email_not_confirmed');
});

test('falls back to a generic message rather than leaking internals', () => {
  const r = toFriendlyAuthError({ message: 'pq: duplicate key value violates unique constraint' });
  assert.equal(r.kind, 'unknown');
  assert.doesNotMatch(r.message, /pq:|constraint/);
});

test('handles null and undefined without throwing', () => {
  assert.equal(toFriendlyAuthError(null).kind, 'unknown');
  assert.equal(toFriendlyAuthError(undefined).kind, 'unknown');
});

test('accepts a plain string error', () => {
  assert.equal(toFriendlyAuthError('Token has expired').kind, 'expired_otp');
});
