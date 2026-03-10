'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SeadLogo from './SeadLogo';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SeadLogo className="w-32 h-20" />
        </div>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-sm text-gray-600 mb-8">
            Enter the 6-digit code sent to <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-200">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Verification Code
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
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border transition-all duration-200 outline-none
                    ${error
                      ? 'border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                      : digit
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}
                  `}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {loading && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-indigo-600">Verifying...</span>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <p className="text-sm text-gray-600 mb-3">Didn&apos;t receive the code?</p>
            {countdown > 0 ? (
              <p className="text-sm font-medium text-gray-700">
                Resend available in <span className="text-indigo-600 font-semibold">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResendOTP}
                disabled={resending}
                className="text-indigo-600 font-medium hover:text-indigo-500 transition-colors disabled:opacity-50 text-sm"
              >
                {resending ? 'Sending Code...' : 'Resend Verification Code'}
              </button>
            )}
          </div>

          <button
            onClick={onBack}
            disabled={loading}
            className="w-full bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Back to {type === 'signup' ? 'Signup' : 'Login'}
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 text-center leading-relaxed">
              For security, this code will expire in 10 minutes. Please keep this screen open while checking your inbox.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Secure Enterprise Approval & Documentation System
          </p>
        </div>
      </div>
    </div>
  );
}