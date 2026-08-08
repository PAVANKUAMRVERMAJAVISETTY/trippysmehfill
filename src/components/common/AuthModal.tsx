import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { X, Lock, Mail, User, Phone, MapPin, AlertCircle, ShieldCheck, Key, RefreshCw, CheckCircle, Navigation, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../../types';
import { sendEmailVerificationOTP, verifyEmailOTPCode, sendPasswordResetOTP, resetPasswordWithOTP } from '../../lib/emailService';
import OtpInput from './OtpInput';
import { validateRegistration, validateEmail, validateFullName, validatePhone, validateAddress } from '../../lib/validation';
import { requestValidatedLocation, KITCHEN_LAT, KITCHEN_LNG, MAX_SERVICE_RADIUS_KM } from '../../lib/geoUtils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'register';
  onRegisterSuccess?: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'signin',
  onRegisterSuccess
}) => {
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(defaultTab);

  // Sub-step for registration: 'form' | 'otp_verify' | 'google_verify'
  const [regStep, setRegStep] = useState<'form' | 'otp_verify' | 'google_verify'>('form');

  // Forgot password flow state: 'none' | 'email_input' | 'otp_input'
  const [forgotStep, setForgotStep] = useState<'none' | 'email_input' | 'otp_input'>('none');

  // Show/hide for every password field. A password the user cannot read is a
  // password they mistype -- especially on a phone keyboard, and especially
  // when they are asked to type it twice.
  const [showForgotNew, setShowForgotNew] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleAddress, setGoogleAddress] = useState('');
  const [isGoogleOtpSent, setIsGoogleOtpSent] = useState(false);

  // Form inputs
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Security data
  const [isLocating, setIsLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [distanceFromKitchen, setDistanceFromKitchen] = useState<number>(0);
  // Start empty -- these are filled from the real capture, never seeded with a
  // sample address that would otherwise be written to a customer's profile.
  const [ipAddress, setIpAddress] = useState<string>('');
  const [locationCity, setLocationCity] = useState<string>('');

  // Email OTP state. The code itself lives on the server -- the browser only
  // ever holds what the user typed in.
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Save OTP verification state to sessionStorage
  const savePendingOtpState = (emailAddr: string, nameVal: string, phoneVal: string, addrVal: string, step: 'form' | 'otp_verify' | 'google_verify') => {
    try {
      const stateObj = {
        email: emailAddr,
        fullName: nameVal,
        phone: phoneVal,
        hostelAddress: addrVal,
        regStep: step,
        timestamp: Date.now()
      };
      sessionStorage.setItem('trippys_pending_otp_state', JSON.stringify(stateObj));
    } catch {
      // Storage unavailable
    }
  };

  const clearPendingOtpState = () => {
    try {
      sessionStorage.removeItem('trippys_pending_otp_state');
    } catch {
      // Storage unavailable
    }
  };

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Restore OTP verification state on open, so a customer who reloads or
  // switches away mid-verification is not sent back to the start of signup.
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = sessionStorage.getItem('trippys_pending_otp_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMs = Date.now() - (parsed.timestamp || 0);
        if (ageMs < 600000 && parsed.email) {
          console.log('[AuthModal] Restoring pending OTP verification state for:', parsed.email);
          setEmail(parsed.email);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.hostelAddress) setHostelAddress(parsed.hostelAddress);
          if (parsed.regStep === 'otp_verify') {
            setRegStep('otp_verify');
            setActiveTab('register');
            const remSec = Math.max(0, 60 - Math.floor(ageMs / 1000));
            setResendTimer(remSec);
          }
        }
      }
    } catch {
      // Storage unavailable
    }
  }, [isOpen]);

  // Resend Timer countdown. Every OTP screen sets resendTimer, so the countdown
  // is driven by the timer alone -- gating it on regStep left the Google and
  // password-reset screens stuck at 60s with the resend link never appearing.
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer > 0]);

  if (!isOpen) return null;

  // Phone fields hold exactly ten digits and nothing else. Filtering on the way
  // in means letters, spaces, +91 prefixes and an eleventh digit never land in
  // state at all, so what is submitted is always what the field displays.
  const PHONE_LENGTH = 10;
  const toPhoneDigits = (raw: string) => raw.replace(/\D/g, '').slice(0, PHONE_LENGTH);

  /** Live, per-keystroke message. Empty string means "nothing to complain about yet". */
  const phoneFieldError = (value: string): string => {
    if (!value) return '';
    if (value.length < PHONE_LENGTH) {
      return `Mobile number must be exactly ${PHONE_LENGTH} digits.`;
    }
    const check = validatePhone(value);
    return check.valid ? '' : check.message;
  };

  // Real-Time Hardware Geolocation (Radius restriction removed - open service)
  const captureSecurityDetails = async (): Promise<{ lat: number; lng: number; ip: string; isOK: boolean }> => {
    setIsLocating(true);
    setGeoDenied(false);

    const geoResult = await requestValidatedLocation();

    setIpAddress(geoResult.ipAddress);
    setLatitude(geoResult.latitude);
    setLongitude(geoResult.longitude);
    setDistanceFromKitchen(geoResult.distanceKm);

    setIsLocating(false);
    return { lat: geoResult.latitude, lng: geoResult.longitude, ip: geoResult.ipAddress, isOK: true };
  };

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsSendingForgotOtp(true);
    const result = await sendPasswordResetOTP(forgotEmail.trim());
    setIsSendingForgotOtp(false);

    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    setEnteredOtp('');
    setForgotStep('otp_input');
    setInfoMsg(result.message);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!enteredOtp.trim()) {
      setErrorMsg('Please enter the verification code sent to your email.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsResettingPassword(true);
    const res = await resetPasswordWithOTP(forgotEmail.trim(), enteredOtp.trim(), forgotNewPassword);
    setIsResettingPassword(false);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setInfoMsg('Password updated successfully! You can now sign in with your new password.');
    setTimeout(() => {
      setForgotStep('none');
      setActiveTab('signin');
      // The sign-in form is left empty on purpose -- nothing about the customer
      // is carried across, not even the address they just typed.
      setSignInIdentifier('');
      setSignInPassword('');
      setEnteredOtp('');
    }, 1500);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!signInIdentifier.trim()) {
      setErrorMsg('Please enter your email, mobile, or username.');
      return;
    }

    const geo = await captureSecurityDetails();
    if (!geo.isOK && geoDenied) return;

    const res = await signIn(signInIdentifier.trim(), signInPassword);
    if (res.success) {
      setInfoMsg('Successfully signed in!');
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setErrorMsg(res.message || 'Invalid credentials. Please try again.');
    }
  };

  const handleRegisterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (isSendingOtp) {
      console.log('[AuthModal] Blocked duplicate signup submit while request in flight');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = fullName.trim();
    const cleanAddress = hostelAddress.trim();

    console.log('[AuthModal] Step 1: Validating registration input for:', cleanEmail);
    const validation = validateRegistration({
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      address: cleanAddress,
      password
    });

    if (!validation.valid) {
      console.warn('[AuthModal] Input validation failed:', validation.message);
      setErrorMsg(validation.message);
      return;
    }

    // Capture & Validate Geolocation 15km Geo-fence
    const geo = await captureSecurityDetails();
    if (!geo.isOK) return;

    // Check if email or phone number is already registered via SECURITY DEFINER RPCs (bypasses anon RLS 401 errors)
    try {
      const { data: emailExists } = await supabase.rpc('email_exists', { p_email: cleanEmail });
      if (emailExists) {
        setErrorMsg('This email address is already registered. Please sign in instead or use Forgot Password.');
        return;
      }
      const { data: phoneExists } = await supabase.rpc('phone_exists', { p_phone: cleanPhone });
      if (phoneExists) {
        setErrorMsg('This mobile phone number is already registered to another account. Please sign in instead.');
        return;
      }
    } catch (rpcErr) {
      console.warn('[AuthModal] Duplicate lookup via RPC notice:', rpcErr);
    }

    setIsSendingOtp(true);
    try {
      console.log('[AuthModal] Step 2: Registering user & triggering Signup OTP via Supabase Auth for:', cleanEmail);
      const signUpRes = await signUp({
        full_name: cleanName,
        phone: cleanPhone,
        hostel_address: cleanAddress,
        email: cleanEmail,
        password
      });

      // ALWAYS transition immediately to the OTP Verification step
      setEnteredOtp('');
      setRegStep('otp_verify');
      setResendTimer(60);
      savePendingOtpState(cleanEmail, cleanName, cleanPhone, cleanAddress, 'otp_verify');

      if (!signUpRes.success) {
        console.warn('[AuthModal] signUp returned notice/warning:', signUpRes.message);
        if (signUpRes.message?.toLowerCase().includes('already registered') || signUpRes.message?.toLowerCase().includes('already exists')) {
          const resendResult = await sendEmailVerificationOTP(cleanEmail, cleanName);
          setInfoMsg(resendResult.message);
        } else {
          setErrorMsg(signUpRes.message || `Verification code sent to ${cleanEmail}. Check your inbox.`);
        }
      } else {
        console.log('[AuthModal] User created in auth.users, Signup OTP email dispatched. Transitioning to otp_verify screen.');
        setInfoMsg(`Verification code sent to ${cleanEmail}. Check your inbox (and spam folder).`);
      }
    } catch (err: any) {
      console.error('[AuthModal] Exception during signup OTP dispatch:', err);
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (isSendingOtp || resendTimer > 0) {
      console.log('[AuthModal] Blocked duplicate resend call: isSendingOtp=', isSendingOtp, 'resendTimer=', resendTimer);
      return;
    }

    setErrorMsg('');
    setInfoMsg('');
    setIsSendingOtp(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Send the OTP that belongs to the screen the user is actually on.
      // This always sent the SIGNUP verification code, so pressing "Resend
      // Code" on the password-reset screen mailed the wrong kind of OTP --
      // which then failed verification, with no clue why.
      const isPasswordReset = forgotStep === 'otp_input';

      console.log('[AuthModal] Resending 6-digit OTP code to:', cleanEmail,
        isPasswordReset ? '(password reset)' : '(signup verification)');

      const result = isPasswordReset
        ? await sendPasswordResetOTP(cleanEmail)
        : await sendEmailVerificationOTP(cleanEmail, fullName.trim());

      setResendTimer(60);

      // Only the signup flow has pending state worth restoring after a reload.
      if (!isPasswordReset) {
        savePendingOtpState(cleanEmail, fullName.trim(), phone.trim(), hostelAddress.trim(), 'otp_verify');
      }

      if (!result.success) {
        console.warn('[AuthModal] Resend OTP returned warning/error:', result.message);
        setErrorMsg(result.message);
      } else {
        setInfoMsg(`New security OTP code sent to ${email}!`);
      }
    } catch (err: any) {
      console.error('[AuthModal] Exception during resend OTP:', err);
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // The event is optional so OtpInput can fire this the moment the sixth digit
  // lands, without the user reaching for the button.
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isVerifyingOtp) return;
    setErrorMsg('');
    setInfoMsg('');

    if (isVerifyingOtp) {
      console.log('[AuthModal] Blocked duplicate OTP verification submission');
      return;
    }

    if (!enteredOtp.trim()) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      console.log('[AuthModal] Step 3: Verifying OTP token for email:', email);
      const verification = await verifyEmailOTPCode(email, enteredOtp);
      if (!verification.success) {
        console.warn('[AuthModal] OTP verification failed:', verification.message);
        setIsVerifyingOtp(false);
        setErrorMsg(verification.message);
        return;
      }

      console.log('[AuthModal] Step 4: OTP token verified successfully. Completing user registration...');
      const created = await signUp({
        full_name: fullName,
        phone,
        hostel_address: hostelAddress,
        email,
        password
      });

      setIsVerifyingOtp(false);

      if (!created.success) {
        console.error('[AuthModal] Account creation after OTP verification failed:', created.message);
        setErrorMsg(created.message || 'We could not finish creating your account. Please try again.');
        return;
      }

      clearPendingOtpState();
      console.log('[AuthModal] Step 5: Account & profile created. Auto-logging customer in.');

      const newCustomer: UserProfile = {
        id: 'c-' + Date.now(),
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        hostel_address: hostelAddress.trim(),
        role: 'customer',
        account_status: 'active',
        is_whatsapp_verified: true, // Auto-verified for instant ordering
        is_approved: true, // Auto-approved for instant ordering
        is_active: true,
        auth_provider: 'Email',
        ip_address: ipAddress,
        latitude: latitude || KITCHEN_LAT,
        longitude: longitude || KITCHEN_LNG,
        location_city: locationCity,
        created_at: new Date().toLocaleString()
      };

      if (onRegisterSuccess) {
        onRegisterSuccess(newCustomer);
      }

      setInfoMsg(created.message || 'Email verified and account created successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('[AuthModal] Exception during OTP verification flow:', err);
      setIsVerifyingOtp(false);
      setErrorMsg(err.message || 'Verification failed.');
    }
  };

  const handleStartGoogleSignInFlow = () => {
    setErrorMsg('');
    setInfoMsg('');
    // Nothing is carried over from the other tabs -- the customer types their
    // own details here rather than inheriting whatever was left in a form.
    setGoogleEmailInput('');
    setGoogleFullName('');
    setGooglePhone('');
    setGoogleAddress('');
    setEnteredOtp('');
    setIsGoogleOtpSent(false);
    setRegStep('google_verify');
  };

  const handleSendGoogleOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanName = googleFullName.trim();
    const cleanPhone = googlePhone.trim();
    const cleanAddress = googleAddress.trim();
    const cleanEmail = googleEmailInput.trim().toLowerCase();

    // Same rules as the standard registration form -- no weaker second path.
    const googleValidation = [
      validateFullName(cleanName),
      validateEmail(cleanEmail),
      validatePhone(cleanPhone),
      validateAddress(cleanAddress)
    ].find(c => !c.valid);

    if (googleValidation) {
      setErrorMsg(googleValidation.message);
      return;
    }

    await captureSecurityDetails();

    // Check if email or phone is already registered
    const { data: existingGoogleProfiles } = await supabase
      .from('profiles')
      .select('email, phone')
      .or(`email.ilike.${cleanEmail},phone.eq.${cleanPhone}`);

    if (existingGoogleProfiles && existingGoogleProfiles.length > 0) {
      const matchEmail = existingGoogleProfiles.some(p => p.email?.toLowerCase() === cleanEmail);
      if (matchEmail) {
        setErrorMsg('This email address is already registered. Please sign in instead.');
        return;
      }
      const matchPhone = existingGoogleProfiles.some(p => p.phone === cleanPhone);
      if (matchPhone) {
        setErrorMsg('This phone number is already registered to another account. Please sign in instead.');
        return;
      }
    }

    const result = await sendEmailVerificationOTP(cleanEmail, cleanName);
    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }
    setIsGoogleOtpSent(true);
    setResendTimer(60);
    setInfoMsg(result.message);
  };

  const handleVerifyGoogleOtpSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isVerifyingOtp) return;
    setErrorMsg('');

    const cleanEmail = googleEmailInput.trim().toLowerCase();

    setIsVerifyingOtp(true);
    const verification = await verifyEmailOTPCode(cleanEmail, enteredOtp);
    if (!verification.success) {
      setIsVerifyingOtp(false);
      setErrorMsg(verification.message);
      return;
    }

    try {
      // These passed validateFullName/validatePhone/validateAddress before the
      // code was sent, so they are the customer's own details -- no fallbacks.
      const cleanName = googleFullName.trim();
      const cleanPhone = googlePhone.trim();
      const cleanAddress = googleAddress.trim();

      await signInWithGoogle(
        cleanEmail,
        cleanName,
        cleanPhone,
        cleanAddress,
        ipAddress,
        latitude || KITCHEN_LAT,
        longitude || KITCHEN_LNG
      );

      const newGoogleCustomer: UserProfile = {
        id: 'g-user-' + Date.now(),
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        hostel_address: cleanAddress,
        role: 'customer',
        is_approved: false, // Awaits admin approval, matching what is stored.
        is_active: true,
        auth_provider: 'Google',
        ip_address: ipAddress,
        latitude: latitude || KITCHEN_LAT,
        longitude: longitude || KITCHEN_LNG,
        location_city: locationCity,
        created_at: new Date().toLocaleString()
      };

      if (onRegisterSuccess) {
        onRegisterSuccess(newGoogleCustomer);
      }

      // Signed in already -- go straight to the menu.
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate Google user.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 text-gray-200 relative">
        
        {/* MANDATORY GEOLOCATION DENIED OVERLAY */}
        {geoDenied && (
          <div className="absolute inset-0 z-30 bg-[#0d0d0d]/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white font-serif">Access Denied</h3>
              <p className="text-xs text-rose-300 font-medium px-2 leading-relaxed">
                Access Denied: Location verification is mandatory to prevent fraudulent orders from unauthorized geographic zones.
              </p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-gray-400 text-left space-y-1 w-full font-mono">
              <p className="text-orange-400 font-bold">Why location is required:</p>
              <p>• Prevents out-of-state bot registrations</p>
              <p>• Verifies proximity within 15km Cloud Kitchen radius</p>
            </div>
            <button
              type="button"
              onClick={() => captureSecurityDetails()}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-2xl shadow-xl shadow-rose-600/30 transition text-xs flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Retry Geolocation Permission</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-white font-serif tracking-wide">
              {activeTab === 'signin' ? 'Sign In to Order' : 'Create Customer Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Toggle Tabs (Hidden during Google Verification) */}
        {regStep !== 'google_verify' && (
          <div className="flex p-2 bg-[#0d0d0d] border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setRegStep('form');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
                activeTab === 'signin'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegStep('form');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
                activeTab === 'register'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">

          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP: GOOGLE ACCOUNT & EMAIL OTP VERIFICATION */}
          {regStep === 'google_verify' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google Account Email Verification</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Enter your Google Account email below. A 6-digit OTP code will be dispatched to your inbox to verify identity.
                </p>
              </div>

              {!isGoogleOtpSent ? (
                <form onSubmit={handleSendGoogleOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={googleFullName}
                        onChange={(e) => setGoogleFullName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      10-Digit Mobile Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={PHONE_LENGTH}
                        value={googlePhone}
                        onChange={(e) => setGooglePhone(toPhoneDigits(e.target.value))}
                        required
                        aria-invalid={!!phoneFieldError(googlePhone) || undefined}
                        placeholder="10-digit mobile number"
                        className={`w-full pl-9 pr-3 py-2.5 bg-[#181818] border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none ${
                          phoneFieldError(googlePhone)
                            ? 'border-red-500/60 focus:border-red-500'
                            : 'border-white/10 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {phoneFieldError(googlePhone) && (
                      <p className="text-[11px] text-red-400 mt-1">{phoneFieldError(googlePhone)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Hostel / Delivery Address *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={googleAddress}
                        onChange={(e) => setGoogleAddress(e.target.value)}
                        required
                        placeholder="Enter your delivery address"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Google Account Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        required
                        placeholder="Enter your email"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLocating}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Capturing Hardware Geolocation...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Verification Code to Google Email</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegStep('form')}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel / Back
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyGoogleOtpSubmit} className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-blue-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" /> Google Security Code Dispatched
                      </span>
                      <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                        CHECK INBOX
                      </span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Verification code sent to <strong className="text-white">{googleEmailInput}</strong>. Please check your inbox or spam folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Enter Google OTP *
                    </label>
                    <OtpInput
                      value={enteredOtp}
                      onChange={setEnteredOtp}
                      onComplete={() => handleVerifyGoogleOtpSubmit()}
                      disabled={isVerifyingOtp}
                      hasError={!!errorMsg}
                      autoFocus
                      label="Google verification code"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition text-xs flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Verify & Sign In with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGoogleOtpSent(false)}
                    className="w-full py-1 text-xs text-gray-400 hover:text-white"
                  >
                    Use Different Google Email
                  </button>
                </form>
              )}
            </div>
          )}

          {/* FORGOT PASSWORD STEP 1: EMAIL INPUT */}
          {forgotStep === 'email_input' && (
            <form onSubmit={handleSendForgotOtp} className="space-y-4">
              <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-orange-400 font-bold">
                  <Key className="w-4 h-4" />
                  <span>Reset Your Password</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Enter your registered email address below. We will send you an OTP code to reset your password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingForgotOtp}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg transition text-xs flex items-center justify-center gap-2"
              >
                {isSendingForgotOtp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>Send Password Reset OTP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotStep('none');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="w-full py-1 text-xs text-gray-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD STEP 2: OTP & NEW PASSWORD */}
          {forgotStep === 'otp_input' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-xs space-y-1">
                <p className="text-orange-400 font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> Reset Code Sent
                </p>
                <p className="text-gray-300 text-[11px]">
                  Check your inbox <strong className="text-white">{forgotEmail}</strong> for the verification OTP code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Enter Verification OTP Code *
                </label>
                {/* No onComplete here -- the same form still needs the new password,
                    so submitting on the sixth digit would fire too early. */}
                <OtpInput
                  value={enteredOtp}
                  onChange={setEnteredOtp}
                  disabled={isResettingPassword}
                  hasError={!!errorMsg}
                  autoFocus
                  label="Password reset code"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showForgotNew ? 'text' : 'password'}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNew(v => !v)}
                    aria-label={showForgotNew ? 'Hide new password' : 'Show new password'}
                    aria-pressed={showForgotNew}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition"
                  >
                    {showForgotNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showForgotConfirm ? 'text' : 'password'}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter your password"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirm(v => !v)}
                    aria-label={showForgotConfirm ? 'Hide confirmed new password' : 'Show confirmed new password'}
                    aria-pressed={showForgotConfirm}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition"
                  >
                    {showForgotConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isResettingPassword}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg transition text-xs flex items-center justify-center gap-2"
              >
                {isResettingPassword ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Update Password & Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotStep('none');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="w-full py-1 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </form>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'signin' && forgotStep === 'none' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Mobile Number / Email Address / Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    required
                    placeholder="Enter your phone or email"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email_input');
                      setForgotEmail(signInIdentifier.includes('@') ? signInIdentifier.trim() : '');
                      setErrorMsg('');
                      setInfoMsg('');
                    }}
                    className="text-[11px] text-orange-400 hover:underline font-bold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSignIn ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignIn(v => !v)}
                    aria-label={showSignIn ? 'Hide password' : 'Show password'}
                    aria-pressed={showSignIn}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition"
                  >
                    {showSignIn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg shadow-orange-600/30 transition text-xs"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setRegStep('form');
                      setErrorMsg('');
                    }}
                    className="text-orange-400 font-extrabold hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER STEP 1: FORM INPUTS */}
          {activeTab === 'register' && regStep === 'form' && (
            <form onSubmit={handleRegisterFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={PHONE_LENGTH}
                    value={phone}
                    onChange={(e) => setPhone(toPhoneDigits(e.target.value))}
                    required
                    aria-invalid={!!phoneFieldError(phone) || undefined}
                    placeholder="10-digit mobile number"
                    className={`w-full pl-9 pr-3 py-2.5 bg-[#181818] border rounded-xl text-xs text-white placeholder-gray-500 outline-none ${
                      phoneFieldError(phone)
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-white/10 focus:border-orange-500'
                    }`}
                  />
                </div>
                {phoneFieldError(phone) && (
                  <p className="text-[11px] text-red-400 mt-1">{phoneFieldError(phone)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Hostel / Delivery Address *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hostelAddress}
                    onChange={(e) => setHostelAddress(e.target.value)}
                    required
                    placeholder="Enter your delivery address"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSignUp ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-12 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUp(v => !v)}
                    aria-label={showSignUp ? 'Hide password' : 'Show password'}
                    aria-pressed={showSignUp}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition"
                  >
                    {showSignUp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLocating || isSendingOtp}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg shadow-orange-600/30 transition text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLocating || isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isSendingOtp ? 'Sending OTP Verification Code...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Continue to Verification OTP</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-400">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setErrorMsg('');
                    }}
                    className="text-orange-400 font-extrabold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER STEP 2: EMAIL 6-DIGIT OTP VERIFICATION */}
          {activeTab === 'register' && regStep === 'otp_verify' && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              
              {/* Email Security Dispatched Banner */}
              <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-orange-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> Email Verification OTP
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    SENT TO INBOX
                  </span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  An OTP security code has been sent to <strong className="text-white">{email}</strong>. Please check your email inbox to verify.
                </p>
              </div>

              {/* OTP Input Field */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Enter Email OTP Code *
                </label>
                <OtpInput
                  value={enteredOtp}
                  onChange={setEnteredOtp}
                  onComplete={() => handleVerifyOtpSubmit()}
                  disabled={isVerifyingOtp}
                  hasError={!!errorMsg}
                  autoFocus
                  label="Email verification code"
                />
              </div>

              {/* Resend Timer & Button */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <span>Resend OTP Code:</span>
                {resendTimer > 0 ? (
                  <span className="font-mono text-orange-400 font-bold">{resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="text-orange-400 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                    <span>{isSendingOtp ? 'Sending...' : 'Resend Code'}</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg shadow-orange-600/30 transition text-xs flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Verify & Complete Registration</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRegStep('form')}
                className="w-full py-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                ← Back / Edit Registration Details
              </button>
            </form>
          )}

          {/* GOOGLE OAUTH BUTTON (Hidden during Google Verification step) */}
          {regStep !== 'google_verify' && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#121212] px-3 text-gray-500 font-medium">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartGoogleSignInFlow}
                disabled={isLocating}
                className="w-full py-2.5 px-4 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-200 font-bold rounded-xl flex items-center justify-center gap-3 transition shadow-sm text-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
