import { supabase, isSupabaseConfigured } from './supabase';
import { toFriendlyAuthError, NOT_CONFIGURED_MESSAGE } from './authErrors';
import { validateEmail } from './validation';

export interface SendOtpResult {
  success: boolean;
  message: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
}

type FailureResult = { success: false; message: string };

const failure = (message: string): FailureResult => ({ success: false, message });

/**
 * Normalises the address and applies the two gates every email flow shares:
 * the address must be valid and Supabase must be configured. Returns the clean
 * address, or the failure to hand straight back to the caller.
 */
function prepareEmail(email: string): { email: string } | FailureResult {
  const cleanEmail = email.trim().toLowerCase();

  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.valid) return failure(emailCheck.message);

  if (!isSupabaseConfigured) return failure(NOT_CONFIGURED_MESSAGE);

  return { email: cleanEmail };
}

/** Same gates for the verify flows, which also need a plausible OTP token. */
function prepareOtp(email: string, enteredOtp: string): { email: string; token: string } | FailureResult {
  const token = enteredOtp.trim();

  if (!token) {
    return failure('Please enter the verification code sent to your email.');
  }
  if (!/^\d{6,8}$/.test(token)) {
    return failure('Enter the verification code from your email.');
  }

  if (!isSupabaseConfigured) return failure(NOT_CONFIGURED_MESSAGE);

  return { email: email.trim().toLowerCase(), token };
}

function isFailure<T extends object>(result: T | FailureResult): result is FailureResult {
  return 'success' in result && result.success === false;
}

/**
 * Runs a Supabase call and maps every thrown or returned error through the
 * shared friendly-message translation.
 */
async function runAuthCall(
  operation: () => Promise<{ error: unknown } | void>,
  successMessage: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await operation();
    const error = result && 'error' in result ? result.error : null;
    if (error) return failure(toFriendlyAuthError(error).message);
    return { success: true, message: successMessage };
  } catch (err) {
    return failure(toFriendlyAuthError(err).message);
  }
}

/**
 * Sends a 6-digit email verification code using Supabase Auth.
 *
 * Supabase generates, stores, expires and rate-limits the code, and delivers the
 * email. Nothing about the code is ever visible to this application, which is
 * what makes the check meaningful -- an earlier version generated the code in
 * the browser and compared it there, so it could be read and bypassed.
 */
export async function sendEmailVerificationOTP(
  email: string,
  fullName: string
): Promise<SendOtpResult> {
  const prepared = prepareEmail(email);
  if (isFailure(prepared)) return prepared;
  const cleanEmail = prepared.email;

  return runAuthCall(
    () =>
      supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          // Create the auth user on first verification; profile rows are written
          // once the code is confirmed.
          shouldCreateUser: true,
          data: fullName ? { full_name: fullName.trim() } : undefined
        }
      }),
    `Verification code sent to ${cleanEmail}. Check your inbox (and spam folder).`
  );
}

/**
 * Sends a sign-in code to an EXISTING account only.
 *
 * `shouldCreateUser: false` means an unknown address is rejected rather than
 * silently registered.
 */
export async function sendSignInOTP(email: string): Promise<SendOtpResult> {
  const prepared = prepareEmail(email);
  if (isFailure(prepared)) return prepared;
  const cleanEmail = prepared.email;

  return runAuthCall(
    () =>
      supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false }
      }),
    `Sign-in code sent to ${cleanEmail}. Check your inbox.`
  );
}

/**
 * Verifies the code with Supabase. On success Supabase establishes a session,
 * which the auth context picks up via onAuthStateChange.
 */
export async function verifyEmailOTPCode(
  email: string,
  enteredOtp: string
): Promise<VerifyOtpResult> {
  const prepared = prepareOtp(email, enteredOtp);
  if (isFailure(prepared)) return prepared;

  return runAuthCall(
    () =>
      supabase.auth.verifyOtp({
        email: prepared.email,
        token: prepared.token,
        type: 'email'
      }),
    'Email address verified successfully!'
  );
}

/**
 * Sends a password reset OTP code to the user's registered email.
 */
export async function sendPasswordResetOTP(email: string): Promise<SendOtpResult> {
  const prepared = prepareEmail(email);
  if (isFailure(prepared)) return prepared;
  const cleanEmail = prepared.email;

  try {
    // Check if profile exists first to prevent 500 auth errors on non-existent accounts
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        message: `No account found for "${cleanEmail}". Please click "Create Account" to register.`
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return {
      success: true,
      message: `Password reset OTP code sent to ${cleanEmail}. Check your inbox.`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Verifies the password reset OTP code and updates the user's password.
 */
export async function resetPasswordWithOTP(
  email: string,
  enteredOtp: string,
  newPassword: string
): Promise<VerifyOtpResult> {
  const prepared = prepareOtp(email, enteredOtp);
  if (isFailure(prepared)) return prepared;
  const { email: cleanEmail, token } = prepared;

  if (!newPassword || newPassword.length < 6) {
    return failure('Password must be at least 6 characters long.');
  }

  try {
    // 1. Verify recovery OTP to establish session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'recovery'
    });

    if (verifyError) {
      // Fallback try type 'email' if recovery token type is set as email
      const { error: emailVerifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'email'
      });
      if (emailVerifyError) {
        return { success: false, message: toFriendlyAuthError(verifyError).message };
      }
    }

    // 2. Update user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return { success: false, message: toFriendlyAuthError(updateError).message };
    }

    return { success: true, message: 'Your password has been updated successfully! You are now signed in.' };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}
