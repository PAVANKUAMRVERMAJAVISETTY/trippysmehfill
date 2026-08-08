import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendPhoneOTP, verifyPhoneOTPCode, sendEmailOTP, verifyEmailOTPCode, DEV_TEST_CREDENTIALS } from '../src/lib/otpService';

test('DEV_TEST_CREDENTIALS contains standard test numbers', () => {
  assert.equal(Array.isArray(DEV_TEST_CREDENTIALS), true);
  assert.equal(DEV_TEST_CREDENTIALS.length >= 2, true);
  assert.equal(DEV_TEST_CREDENTIALS[0].otp, '123456');
});

test('rejects invalid phone numbers for OTP request', async () => {
  const r = await sendPhoneOTP('123');
  assert.equal(r.success, false);
  assert.match(r.message, /valid 10-digit/i);
});

test('rejects invalid OTP token format', async () => {
  const r = await verifyPhoneOTPCode('9876543210', '123');
  assert.equal(r.success, false);
  assert.match(r.message, /6-digit/i);
});

test('rejects invalid email for OTP request', async () => {
  const r = await sendEmailOTP('invalid-email-string');
  assert.equal(r.success, false);
  assert.match(r.message, /email/i);
});

test('rejects invalid email OTP code format', async () => {
  const r = await verifyEmailOTPCode('test@example.com', 'abc');
  assert.equal(r.success, false);
  assert.match(r.message, /6-digit/i);
});
