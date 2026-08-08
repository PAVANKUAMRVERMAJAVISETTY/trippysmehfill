import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateEmail,
  validatePhone,
  validateFullName,
  validateAddress,
  validatePassword,
  validateRegistration,
  escapeHtml
} from '../src/lib/validation';

const VALID = {
  fullName: 'Baji Yadav',
  email: 'baji@example.com',
  phone: '9876543210',
  address: 'GLS Homes, Sohna, Haryana',
  password: 'Str0ngPass!2026'
};

test('accepts a well-formed registration', () => {
  assert.equal(validateRegistration(VALID).valid, true);
});

test('rejects empty input across every field', () => {
  const result = validateRegistration({
    fullName: '', email: '', phone: '', address: '', password: ''
  });
  assert.equal(result.valid, false);
});

test('rejects whitespace-only input (was previously accepted after trim)', () => {
  const result = validateRegistration({
    fullName: '   ', email: '   ', phone: '   ', address: '   ', password: '        '
  });
  assert.equal(result.valid, false);
});

// --- email -----------------------------------------------------------------

test('rejects malformed emails', () => {
  const bad = [
    'notanemail', 'no@domain', '@example.com', 'user@', 'user@@example.com',
    'user@.com', 'user@example.', 'user@-example.com', 'us..er@example.com',
    '.user@example.com', 'user.@example.com', 'user@example.c0m', 'user name@example.com'
  ];
  for (const email of bad) {
    assert.equal(validateEmail(email).valid, false, `should reject: ${email}`);
  }
});

test('rejects email header injection via newline', () => {
  assert.equal(validateEmail('victim@example.com\nBcc: attacker@evil.com').valid, false);
  assert.equal(validateEmail('victim@example.com\r\nSubject: pwned').valid, false);
});

test('rejects an over-length email', () => {
  assert.equal(validateEmail('a'.repeat(250) + '@example.com').valid, false);
});

test('accepts normal emails', () => {
  for (const email of ['a.b@example.com', 'user+tag@sub.example.co', 'USER@EXAMPLE.COM']) {
    assert.equal(validateEmail(email).valid, true, `should accept: ${email}`);
  }
});

// --- phone -----------------------------------------------------------------

test('rejects invalid phone numbers', () => {
  for (const phone of ['123', '12345678901', '5876543210', 'abcdefghij']) {
    assert.equal(validatePhone(phone).valid, false, `should reject: ${phone}`);
  }
});

test('accepts valid Indian mobile numbers', () => {
  for (const phone of ['6000000000', '7123456789', '9876543210', '+919876543210', '98765 43210']) {
    assert.equal(validatePhone(phone).valid, true, `should accept: ${phone}`);
  }
});

// --- name / address --------------------------------------------------------

test('rejects names with digits, symbols or script tags', () => {
  for (const name of ['12345', 'Baji123', '<script>alert(1)</script>', '!!!', 'a']) {
    assert.equal(validateFullName(name).valid, false, `should reject: ${name}`);
  }
});

test('accepts real-world names', () => {
  for (const name of ["O'Brien", 'Jean-Luc Picard', 'Dr. Baji Yadav', 'Ramírez']) {
    assert.equal(validateFullName(name).valid, true, `should accept: ${name}`);
  }
});

test('rejects an over-length name and address', () => {
  assert.equal(validateFullName('a'.repeat(100)).valid, false);
  assert.equal(validateAddress('a'.repeat(500)).valid, false);
});

test('rejects a too-short address', () => {
  assert.equal(validateAddress('abc').valid, false);
});

// --- password --------------------------------------------------------------

test('rejects passwords under the minimum length', () => {
  // The old rule allowed 6 characters.
  assert.equal(validatePassword('Abc12!').valid, false);
  assert.equal(validatePassword('1234567').valid, false);
});

test('rejects common passwords', () => {
  for (const pw of ['password', 'password123', '12345678', 'qwerty123', 'admin123', 'trippys123']) {
    assert.equal(validatePassword(pw).valid, false, `should reject: ${pw}`);
  }
});

test('rejects repeated characters and simple sequences', () => {
  assert.equal(validatePassword('aaaaaaaa').valid, false);
  assert.equal(validatePassword('12345678').valid, false);
  assert.equal(validatePassword('abcdefgh').valid, false);
});

test('rejects single-character-class passwords', () => {
  assert.equal(validatePassword('abcdefghij').valid, false);
  assert.equal(validatePassword('9184756231').valid, false);
});

test('rejects a password containing the user own identifiers', () => {
  assert.equal(validatePassword('baji12345!', { email: 'baji@example.com' }).valid, false);
  assert.equal(validatePassword('x9876543210Z', { phone: '9876543210' }).valid, false);
  assert.equal(validatePassword('BajiYadav99', { fullName: 'bajiyadav' }).valid, false);
});

test('rejects an over-length password (hashing DoS guard)', () => {
  assert.equal(validatePassword('Aa1' + 'x'.repeat(200)).valid, false);
});

test('accepts strong passwords', () => {
  for (const pw of ['Str0ngPass!2026', 'correct-horse-Battery9', 'Tr!ppy$Mehf1ll']) {
    assert.equal(validatePassword(pw).valid, true, `should accept: ${pw}`);
  }
});

// --- html escaping ---------------------------------------------------------

test('escapes HTML so a name cannot inject markup into the OTP email', () => {
  assert.equal(
    escapeHtml('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
  assert.equal(escapeHtml(`" & '`), '&quot; &amp; &#39;');
});
