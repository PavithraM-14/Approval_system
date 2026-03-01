'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OTPVerificationProps {
  email: string;
  type: 'signup' | 'forgot-password';
  onVerify?: (otp: string) => Promise<void>;
  onResend?: () => Promise<boolean>;
  onBack: () => void;
}

export default function OTPVerification({ email, type, onVerify, onResend, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    const lastFilledIndex = newOtp.findIndex(digit => digit === '');
    const focusIndex = lastFilledIndex === -1 ? 5 : lastFilledIndex;
    inputRefs.current[focusIndex]?.focus();

    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode: string) => {
    setLoading(true);
    setError('');

    try {
      if (onVerify) {
        await onVerify(otpCode);
      } else {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp: otpCode, type }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid OTP');
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          return;
        }

        if (type === 'forgot-password') {
          router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${otpCode}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');

    try {
      if (onResend) {
        await onResend();
      } else {
        const response = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to resend OTP');
          return;
        }
      }

      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full space-y-8 animate-fadeIn relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center mb-6 transform rotate-3">
            <span className="text-white text-2xl font-black tracking-tighter">SE</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Security Verification
          </h1>
          <p className="mt-2 text-slate-400 font-medium">
            Enter the 6-digit code sent to <span className="text-white font-bold">{email}</span>
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">
          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-300 mb-4 text-center">
              OTP Code
            </label>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all duration-200 outline-none
                    ${error
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : digit
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-700 bg-slate-900/50 text-white focus:border-blue-500/50'}
                  `}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {loading && (
            <div className="text-center mb-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm font-semibold text-blue-400 mt-3 uppercase tracking-wider">Verifying...</p>
            </div>
          )}

          <div className="text-center mb-8">
            <p className="text-sm text-slate-400 mb-2 font-medium">Didn&apos;t receive the code?</p>
            {countdown > 0 ? (
              <p className="text-sm font-bold text-slate-300">
                Resend available in <span className="text-blue-400">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResendOTP}
                disabled={resending}
                className="text-blue-400 font-bold hover:text-blue-300 transition-colors disabled:opacity-50 text-sm flex items-center justify-center w-full gap-2"
              >
                {resending ? 'Sending Code...' : 'Resend Verification Code'}
              </button>
            )}
          </div>

          <button
            onClick={onBack}
            disabled={loading}
            className="w-full bg-slate-900/50 border border-slate-700 hover:bg-slate-900 text-slate-300 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            Back to {type === 'signup' ? 'Signup' : 'Login'}
          </button>

          <div className="mt-8 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
            <p className="text-xs text-blue-400/80 text-center leading-relaxed font-medium">
              For security, this code will expire in 60 seconds. Please keep this screen open while checking your inbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}