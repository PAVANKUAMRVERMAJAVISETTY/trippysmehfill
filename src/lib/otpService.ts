import { supabase, isSupabaseConfigured } from './supabase';
import { toFriendlyAuthError, NOT_CONFIGURED_MESSAGE } from './authErrors';
import { validateEmail, validatePhone } from './validation';

export interface OtpResult {
  success: boolean;
  message: string;
}

/**
 * Indicates whether Development OTP mode is enabled.
 * In development builds (`import.meta.env.DEV`), static test credentials or fallback OTPs
 * can be used for rapid local and staging verification without consuming SMS/email API credits.
 */
export const IS_DEV_MODE = Boolean((import.meta as any).env?.DEV);

/**
 * Standard test phone numbers and static test OTPs for team verification.
 */
export const DEV_TEST_CREDENTIALS = [
  { phone: '+919876543210', formattedPhone: '9876543210', otp: '123456', name: 'Test Teammate' },
  { phone: '+919999999999', formattedPhone: '9999999999', otp: '123456', name: 'Dev Admin' }
];

/**
 * Sends a Phone SMS OTP code via Supabase Auth.
 * In DEV mode, logs a helpful developer console message with instructions.
 */
export async function sendPhoneOTP(phoneInput: string): Promise<OtpResult> {
  const phoneValidation = validatePhone(phoneInput);
  if (!phoneValidation.valid) {
    return { success: false, message: phoneValidation.message };
  }

  const digits = phoneInput.trim().replace(/\D/g, '');
  const fullPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone
    });

    if (error) {
      if (IS_DEV_MODE) {
        console.warn(`[DEV OTP] Phone OTP delivery warning for ${fullPhone}:`, error.message);
        console.info(`[DEV OTP] For zero-cost testing, configure Test Phone Number "${fullPhone}" with code "123456" in Supabase Auth -> Phone Provider settings.`);
      }
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    if (IS_DEV_MODE) {
      console.log(`[DEV OTP] Verification code requested for ${fullPhone}. Use 123456 if configured as a test number.`);
    }

    return {
      success: true,
      message: `OTP code sent to ${fullPhone}. Please enter the 6-digit verification code.`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Verifies a Phone SMS OTP code with Supabase Auth.
 */
export async function verifyPhoneOTPCode(phoneInput: string, otpCode: string): Promise<OtpResult> {
  const cleanCode = otpCode.trim();
  if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, message: 'Please enter a valid 6-digit verification code.' };
  }

  const digits = phoneInput.trim().replace(/\D/g, '');
  const fullPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: cleanCode,
      type: 'sms'
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    if (data.session) {
      return {
        success: true,
        message: 'Phone number verified successfully!'
      };
    }

    return { success: true, message: 'OTP verified!' };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Sends an Email OTP verification code via Supabase Auth.
 */
export async function sendEmailOTP(emailInput: string, fullName?: string): Promise<OtpResult> {
  const emailCheck = validateEmail(emailInput);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  const cleanEmail = emailInput.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        data: fullName ? { full_name: fullName.trim() } : undefined
      }
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return {
      success: true,
      message: `Email verification code sent to ${cleanEmail}. Check your inbox.`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Verifies an Email OTP code with Supabase Auth.
 */
export async function verifyEmailOTPCode(emailInput: string, otpCode: string): Promise<OtpResult> {
  const cleanCode = otpCode.trim();
  if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, message: 'Please enter the 6-digit verification code sent to your email.' };
  }

  const cleanEmail = emailInput.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'email'
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return { success: true, message: 'Email verified successfully!' };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}
