import React, { useEffect, useRef } from 'react';

interface OtpInputProps {
  /** The code entered so far. Always digits only, never longer than `length`. */
  value: string;
  onChange: (value: string) => void;
  /** Fired once the last box is filled, so a pure-verification form can submit itself. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Draws the boxes in the error colour and marks them invalid to assistive tech. */
  hasError?: boolean;
  /** Announced to screen readers in place of the individual box labels. */
  label?: string;
}

/**
 * Six-box one-time-code entry.
 *
 * Split boxes are not decoration: `autoComplete="one-time-code"` lets iOS and
 * Android offer the code straight from the notification, and the OS delivers the
 * whole string to the first box -- so every handler here treats multi-character
 * input the same as a paste and spreads it across the boxes.
 *
 * The value stays a plain digit string rather than a fixed-length array with
 * holes, because callers hand it directly to Supabase's verifyOtp.
 */
const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = false,
  hasError = false,
  label = 'Verification code'
}) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    const el = inputsRef.current[clamped];
    el?.focus();
    el?.select();
  };

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  /** Writes `digits` starting at `index`, then parks the caret after the last one. */
  const writeAt = (index: number, digits: string) => {
    const merged = chars.slice(0, index).join('') + digits + chars.slice(index + digits.length).join('');
    const clean = commit(merged);
    focusBox(Math.min(index + digits.length, clean.length));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');

    // An empty box after a change means the character was selected and deleted.
    if (!digits) {
      commit(chars.slice(0, index).join('') + chars.slice(index + 1).join(''));
      return;
    }

    writeAt(index, digits);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (chars[index]) {
        // Clear this box and stay put, so holding backspace walks the code back.
        commit(chars.slice(0, index).join('') + chars.slice(index + 1).join(''));
      } else if (index > 0) {
        commit(chars.slice(0, index - 1).join('') + chars.slice(index).join(''));
        focusBox(index - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    e.preventDefault();
    writeAt(index, digits.slice(0, length - index));
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center justify-between gap-2"
    >
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          // Only the first box carries this: the OS autofills one field, and
          // handleChange spreads the delivered code across the rest.
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={char}
          disabled={disabled}
          aria-label={`${label}, digit ${i + 1} of ${length}`}
          aria-invalid={hasError || undefined}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`w-full min-w-0 aspect-square bg-[#181818] border rounded-xl text-center text-lg font-mono font-black outline-none transition
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError
              ? 'border-red-500/60 text-red-400 focus:border-red-500'
              : 'border-white/10 text-orange-400 focus:border-orange-500'}`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
