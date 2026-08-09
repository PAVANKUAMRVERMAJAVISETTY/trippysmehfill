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

const OTP_COOLDOWN_MS = 60000;
const lastSentTimestamps: Record<string, number> = {};

export function getRemainingOtpCooldownSeconds(email: string): number {
  const cleanEmail = email.trim().toLowerCase();
  let lastSent = lastSentTimestamps[cleanEmail] || 0;
  if (!lastSent) {
    try {
      const stored = sessionStorage.getItem(`otp_sent_${cleanEmail}`);
      if (stored) lastSent = parseInt(stored, 10);
    } catch {
      // Storage unavailable
    }
  }
  if (!lastSent) return 0;
  const elapsed = Date.now() - lastSent;
  if (elapsed >= OTP_COOLDOWN_MS) return 0;
  return Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
}

export function recordOtpSentTimestamp(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();
  lastSentTimestamps[cleanEmail] = now;
  try {
    sessionStorage.setItem(`otp_sent_${cleanEmail}`, now.toString());
  } catch {
    // Storage unavailable
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
  const cleanEmail = email.trim().toLowerCase();

  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const remainingCooldown = getRemainingOtpCooldownSeconds(cleanEmail);
  if (remainingCooldown > 0) {
    console.log(`[EmailService] OTP rate limit enforced: ${remainingCooldown}s remaining for ${cleanEmail}`);
    return {
      success: true,
      message: `An OTP verification code was already sent to ${cleanEmail}. Please enter the code or wait ${remainingCooldown}s to resend.`
    };
  }

  try {
    console.log(`[EmailService] Requesting signup OTP resend via Supabase auth.resend for ${cleanEmail}...`);
    
    // 1. Try supabase.auth.resend for signup OTP
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail
    });

    if (!resendErr) {
      recordOtpSentTimestamp(cleanEmail);
      console.log(`[EmailService] Signup OTP successfully sent via Supabase auth.resend to ${cleanEmail}`);
      return {
        success: true,
        message: `Verification code sent to ${cleanEmail}. Check your inbox (and spam folder).`
      };
    }

    console.warn(`[EmailService] auth.resend returned: ${resendErr.message}. Trying signInWithOtp fallback...`);

    // 2. Fallback to signInWithOtp if resend returns an error
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        data: fullName ? { full_name: fullName.trim() } : undefined
      }
    });

    if (otpError) {
      console.error(`[EmailService] Supabase OTP send error for ${cleanEmail}:`, otpError);
      return { success: false, message: toFriendlyAuthError(otpError).message };
    }

    recordOtpSentTimestamp(cleanEmail);
    console.log(`[EmailService] OTP successfully sent via signInWithOtp fallback to ${cleanEmail}`);

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. Check your inbox (and spam folder).`
    };
  } catch (err) {
    console.error(`[EmailService] Exception sending OTP to ${cleanEmail}:`, err);
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Sends a sign-in code to an EXISTING account only.
 *
 * `shouldCreateUser: false` means an unknown address is rejected rather than
 * silently registered.
 */
export async function sendSignInOTP(email: string): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false }
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return {
      success: true,
      message: `Sign-in code sent to ${cleanEmail}. Check your inbox.`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Verifies the code with Supabase. On success Supabase establishes a session,
 * which the auth context picks up via onAuthStateChange.
 */
export async function verifyEmailOTPCode(
  email: string,
  enteredOtp: string
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const token = enteredOtp.trim();

  if (!token) {
    return { success: false, message: 'Please enter the verification code sent to your email.' };
  }

  if (!/^\d{6,8}$/.test(token)) {
    return { success: false, message: 'Enter the verification code from your email.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    console.log(`[EmailService] Verifying OTP for ${cleanEmail} (trying type: 'signup')...`);
    // Try type 'signup' first because signUp creates the user with signup OTP
    let { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'signup'
    });

    if (error) {
      console.warn(`[EmailService] verifyOtp with type 'signup' returned: ${error.message}. Trying fallback type 'email'...`);
      // Fallback try type 'email' if token type was issued via signInWithOtp
      const fallback = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'email'
      });
      if (!fallback.error) {
        error = null;
        console.log(`[EmailService] verifyOtp fallback with type 'email' succeeded for ${cleanEmail}`);
      } else {
        console.error(`[EmailService] Both signup and email verifyOtp failed for ${cleanEmail}:`, fallback.error);
        return { success: false, message: toFriendlyAuthError(error).message };
      }
    } else {
      console.log(`[EmailService] verifyOtp with type 'signup' succeeded for ${cleanEmail}`);
    }

    return { success: true, message: 'Email address verified successfully!' };
  } catch (err) {
    console.error(`[EmailService] Exception verifying OTP for ${cleanEmail}:`, err);
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Sends a password reset OTP code to the user's registered email (supports email or phone number lookup).
 */
export async function sendPasswordResetOTP(identifier: string): Promise<SendOtpResult & { targetEmail?: string }> {
  const trimmed = identifier.trim();

  if (!trimmed) {
    return { success: false, message: 'Please enter your registered mobile number or email address.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const GENERIC_SUCCESS_MSG = 'If an account is associated with this information, recovery instructions have been sent to the registered email.';

  try {
    let targetEmail = trimmed.toLowerCase();

    // If identifier is not an email (e.g. phone number or username), find email from profiles via RPC
    if (!targetEmail.includes('@')) {
      const { data: foundEmail } = await supabase.rpc('lookup_login_email', {
        p_identifier: trimmed
      });

      if (typeof foundEmail === 'string' && foundEmail) {
        targetEmail = foundEmail.toLowerCase();
      } else {
        // Return generic success to prevent phone number enumeration attacks
        return {
          success: true,
          message: GENERIC_SUCCESS_MSG
        };
      }
    } else {
      const emailCheck = validateEmail(targetEmail);
      if (!emailCheck.valid) {
        return { success: false, message: emailCheck.message };
      }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail);

    if (error) {
      console.warn(`[EmailService] resetPasswordForEmail returned error for ${targetEmail}:`, error.message);
      // Still return generic success to prevent email enumeration
      return {
        success: true,
        message: GENERIC_SUCCESS_MSG,
        targetEmail
      };
    }

    return {
      success: true,
      message: GENERIC_SUCCESS_MSG,
      targetEmail
    };
  } catch (err) {
    return {
      success: true,
      message: GENERIC_SUCCESS_MSG
    };
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
  const cleanEmail = email.trim().toLowerCase();
  const token = enteredOtp.trim();

  if (!token) {
    return { success: false, message: 'Please enter the verification code sent to your email.' };
  }

  if (!/^\d{6,8}$/.test(token)) {
    return { success: false, message: 'Enter the verification code from your email.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
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
