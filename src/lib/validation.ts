/**
 * Shared input validation for registration and sign-in.
 *
 * This module has no browser or Node specific imports so that the SAME rules run
 * in the UI (for fast feedback) and on the server (for actual enforcement).
 * Client-side validation is a convenience -- anyone can bypass it with curl --
 * so every rule here must also be applied server-side before data is trusted.
 */

import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  /** User-facing reason the value was rejected. Empty when valid. */
  message: string;
}

export const userRegistrationZodSchema = z.object({
  full_name: z.string().min(3, 'Full name must be at least 3 characters').max(60, 'Full name is too long'),
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  hostel_address: z.string().min(5, 'Delivery address must be at least 5 characters').max(200)
});

export const profileDbZodSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email().max(254),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  hostel_address: z.string().optional(),
  role: z.enum(['customer', 'admin', 'staff', 'driver']),
  is_approved: z.boolean(),
  is_active: z.boolean()
});

export const orderDbZodSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(10, 'Customer phone is required'),
  delivery_address: z.string().min(5, 'Delivery address is required'),
  subtotal: z.number().min(0),
  total_amount: z.number().min(0)
});

const ok: ValidationResult = { valid: true, message: '' };
const fail = (message: string): ValidationResult => ({ valid: false, message });

// Length caps exist to stop oversized payloads being stored or hashed.
export const LIMITS = {
  EMAIL_MAX: 254, // RFC 5321
  NAME_MIN: 3,
  NAME_MAX: 60,
  ADDRESS_MIN: 5,
  ADDRESS_MAX: 200,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128
} as const;

/**
 * Passwords that are trivially guessed. Blocking a known-bad list is more
 * effective than forced composition rules, per NIST SP 800-63B.
 */
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
  'qwerty', 'qwerty123', 'qwertyuiop', 'abc12345', 'iloveyou', 'admin123',
  'welcome1', 'welcome123', 'letmein1', 'monkey123', 'dragon123', '11111111',
  '00000000', 'trippys', 'trippys123', 'mehfill', 'mehfill123', 'football',
  'baseball', 'sunshine', 'princess', 'passw0rd', 'p@ssw0rd', 'zaq12wsx',
  'asdfghjkl', '1q2w3e4r', '987654321', 'india123', 'hyderabad'
]);

/** Control characters have no place in profile fields and can corrupt logs/headers. */
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

export function validateEmail(raw: string): ValidationResult {
  const email = (raw || '').trim().toLowerCase();

  if (!email) return fail('Email address is required.');
  if (email.length > LIMITS.EMAIL_MAX) return fail('Email address is too long.');
  if (CONTROL_CHARS.test(email)) return fail('Email address contains invalid characters.');
  // Newlines in an address are the classic header-injection vector.
  if (/[\s,;<>]/.test(email)) return fail('Email address contains invalid characters.');

  const parts = email.split('@');
  if (parts.length !== 2) return fail('Enter a valid email address (e.g. name@gmail.com).');

  const [local, domain] = parts;
  if (!local || local.length > 64) return fail('Enter a valid email address (e.g. name@gmail.com).');
  if (!domain || !domain.includes('.')) return fail('Enter a valid email address (e.g. name@gmail.com).');
  if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-')) {
    return fail('Enter a valid email address (e.g. name@gmail.com).');
  }
  if (email.includes('..')) return fail('Enter a valid email address (e.g. name@gmail.com).');
  if (local.startsWith('.') || local.endsWith('.')) {
    return fail('Enter a valid email address (e.g. name@gmail.com).');
  }

  const tld = domain.split('.').pop() || '';
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return fail('Enter a valid email address (e.g. name@gmail.com).');
  }
  if (!/^[a-z0-9._%+-]+$/.test(local)) {
    return fail('Enter a valid email address (e.g. name@gmail.com).');
  }
  if (!/^[a-z0-9.-]+$/.test(domain)) {
    return fail('Enter a valid email address (e.g. name@gmail.com).');
  }

  const TYPO_DOMAINS: Record<string, string> = {
    'gmil.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'hotmai.com': 'hotmail.com'
  };

  if (TYPO_DOMAINS[domain]) {
    return fail(`Check your email spelling: did you mean @${TYPO_DOMAINS[domain]}?`);
  }

  return ok;
}

/** Indian mobile numbers: 10 digits starting 6-9, optionally prefixed with +91. */
export function validatePhone(raw: string): ValidationResult {
  const phone = (raw || '').trim().replace(/\s+/g, '');
  if (!phone) return fail('Mobile number is required.');
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
    return ok;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91') && /^91[6-9]\d{9}$/.test(digitsOnly)) {
    return ok;
  }
  return fail('Enter a valid 10-digit mobile number (e.g. 9876543210).');
}

export function validateFullName(raw: string): ValidationResult {
  const name = (raw || '').trim();

  if (!name) return fail('Full name is required.');
  if (name.length < LIMITS.NAME_MIN) {
    return fail(`Full name must be at least ${LIMITS.NAME_MIN} characters.`);
  }
  if (name.length > LIMITS.NAME_MAX) {
    return fail(`Full name must be under ${LIMITS.NAME_MAX} characters.`);
  }
  if (CONTROL_CHARS.test(name)) return fail('Full name contains invalid characters.');
  // Letters (incl. accented), spaces, hyphens, apostrophes and dots only.
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) {
    return fail('Full name may only contain letters, spaces, hyphens and apostrophes.');
  }
  if (!/\p{L}{2}/u.test(name)) return fail('Enter your real full name.');

  return ok;
}

export function validateAddress(raw: string): ValidationResult {
  const address = (raw || '').trim();

  if (!address) return fail('Hostel or delivery address is required.');
  if (address.length < LIMITS.ADDRESS_MIN) {
    return fail(`Address must be at least ${LIMITS.ADDRESS_MIN} characters.`);
  }
  if (address.length > LIMITS.ADDRESS_MAX) {
    return fail(`Address must be under ${LIMITS.ADDRESS_MAX} characters.`);
  }
  if (CONTROL_CHARS.test(address)) return fail('Address contains invalid characters.');
  if (!/\p{L}{2}/u.test(address)) return fail('Enter a valid delivery address.');

  return ok;
}

/**
 * Password policy. Follows NIST SP 800-63B: length is the primary control, and
 * known-bad passwords are blocked rather than forcing arbitrary composition.
 * `context` values (email, name, phone) are rejected as passwords.
 */
export function validatePassword(
  raw: string,
  context: { email?: string; fullName?: string; phone?: string } = {}
): ValidationResult {
  const password = raw || '';

  if (!password) return fail('Password is required.');
  if (password.length < LIMITS.PASSWORD_MIN) {
    return fail(`Password must be at least ${LIMITS.PASSWORD_MIN} characters long.`);
  }
  if (password.length > LIMITS.PASSWORD_MAX) {
    return fail(`Password must be under ${LIMITS.PASSWORD_MAX} characters.`);
  }
  if (CONTROL_CHARS.test(password)) return fail('Password contains invalid characters.');
  if (!password.trim()) return fail('Password cannot be only spaces.');

  const lower = password.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) {
    return fail('That password is too common. Please choose something harder to guess.');
  }

  // All one character, or a simple ascending/descending run.
  if (/^(.)\1+$/.test(password)) {
    return fail('Password cannot be a single repeated character.');
  }
  if ('0123456789'.includes(password) || 'abcdefghijklmnopqrstuvwxyz'.includes(lower)) {
    return fail('Password cannot be a simple sequence.');
  }

  // Must mix character types -- a low bar, but it rules out "aaaaaaaa1".
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(re => re.test(password)).length;
  if (classes < 2) {
    return fail('Password must include at least two of: lowercase, uppercase, numbers, symbols.');
  }

  // Don't let the password be the user's own identifiers.
  const localPart = (context.email || '').trim().toLowerCase().split('@')[0];
  if (localPart && localPart.length >= 3 && lower.includes(localPart)) {
    return fail('Password must not contain your email address.');
  }
  if (context.phone && context.phone.trim().length >= 4 && password.includes(context.phone.trim())) {
    return fail('Password must not contain your phone number.');
  }
  const name = (context.fullName || '').trim().toLowerCase();
  if (name.length >= 3 && lower.includes(name)) {
    return fail('Password must not contain your name.');
  }

  return ok;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
}

/**
 * Runs every registration rule and returns the first failure, so the caller can
 * surface one clear message at a time.
 */
export function validateRegistration(input: RegistrationInput): ValidationResult {
  const checks = [
    validateFullName(input.fullName),
    validateEmail(input.email),
    validatePhone(input.phone),
    validateAddress(input.address),
    validatePassword(input.password, {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone
    })
  ];

  return checks.find(c => !c.valid) || ok;
}

/** Escapes text before it is interpolated into HTML (e.g. an outbound email). */
export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
