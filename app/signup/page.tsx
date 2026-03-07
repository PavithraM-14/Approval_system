'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '../../lib/types';
import PasswordInput from '../../components/PasswordInput';
import OTPVerification from '../../components/OTPVerification';

type SignupType = 'company' | 'employee';
type Step = 'type-selection' | 'form' | 'otp';

interface Company {
  _id: string;
  name: string;
}

export default function SignupPage() {
  const [step, setStep] = useState<Step>('type-selection');
  const [signupType, setSignupType] = useState<SignupType>('company');
  
  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Company-specific fields
  const [companyName, setCompanyName] = useState('');
  
  // Employee-specific fields
  const [empId, setEmpId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpData, setOtpData] = useState<{
    otp: string;
    otpTimestamp: string;
  } | null>(null);
  
  const router = useRouter();

  // Fetch companies for employee signup
  useEffect(() => {
    if (signupType === 'employee') {
      fetchCompanies();
      fetchRoles();
    }
  }, [signupType]);

  // Filter companies based on search query
  useEffect(() => {
    if (companySearchQuery.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company =>
        company.name.toLowerCase().includes(companySearchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [companySearchQuery, companies]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setFilteredCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Failed to fetch companies', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data: Role[] = await res.json();
        // Filter out system admin roles for employee signup
        const nonAdminRoles = data.filter(r => !r.isSystemAdmin);
        setRoles(nonAdminRoles);
        if (nonAdminRoles.length > 0) {
          setSelectedRoleId(nonAdminRoles[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const inputClass =
    'mt-1 block w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all';

  const labelClass = 'block text-sm font-semibold text-slate-300 ml-1';

  const validateContactNo = () => {
    if (contactNo) {
      const digits = contactNo.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Contact number must be exactly 10 digits');
      } else {
        setError('');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const contactDigits = contactNo.replace(/\D/g, '');
    if (contactDigits.length !== 10) {
      setError('Contact number must be exactly 10 digits');
      setLoading(false);
      return;
    }

    // Validate based on signup type
    if (signupType === 'company') {
      if (!companyName || !name || !email || !contactNo || !password) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
    } else {
      if (!name || !empId || !email || !contactNo || !password || !selectedCompanyId || !selectedRoleId) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
    }

    try {
      // Send OTP to email
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'signup',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpData({
          otp: data.otp,
          otpTimestamp: new Date().toISOString(),
        });
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = async (otp: string) => {
    try {
      const contactDigits = contactNo.replace(/\D/g, '');
      const formattedContactNo = `+91 ${contactDigits}`;

      const endpoint = signupType === 'company' 
        ? '/api/auth/signup-company' 
        : '/api/auth/signup-employee';

      const payload = signupType === 'company'
        ? {
            email,
            otp,
            type: 'signup',
            companyData: {
              companyName,
              adminName: name,
              adminEmail: email,
              adminContactNo: formattedContactNo,
              password,
              otp: otpData?.otp,
              otpTimestamp: otpData?.otpTimestamp,
            },
          }
        : {
            email,
            otp,
            type: 'signup',
            employeeData: {
              name,
              empId,
              email,
              contactNo: formattedContactNo,
              password,
              companyId: selectedCompanyId,
              roleId: selectedRoleId,
              otp: otpData?.otp,
              otpTimestamp: otpData?.otpTimestamp,
            },
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresGoogleAuth && data.googleAuthUrl) {
          window.location.href = data.googleAuthUrl;
        } else {
          const message = signupType === 'company'
            ? 'Company registered successfully! Please login.'
            : 'Account created successfully! Please login.';
          router.push(`/login?message=${encodeURIComponent(message)}`);
        }
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'signup',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpData({
          otp: data.otp,
          otpTimestamp: new Date().toISOString(),
        });
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      throw error;
    }
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        email={email}
        type="signup"
        onVerify={handleOTPVerified}
        onResend={handleResendOTP}
        onBack={() => setStep('form')}
      />
    );
  }

  if (step === 'type-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-4xl w-full space-y-8 animate-fadeIn relative z-10">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              Join S.E.A.D.
            </h2>
            <p className="mt-2 text-slate-400 font-medium">
              Choose your signup type
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Company Signup Card */}
            <button
              onClick={() => {
                setSignupType('company');
                setStep('form');
              }}
              className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10 hover:border-blue-500/50 transition-all hover:scale-105 text-left group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-xl mb-4 group-hover:bg-blue-600/30 transition-colors">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">New Company</h3>
              <p className="text-slate-400">
                Register your company and become the system administrator
              </p>
              <div className="mt-4 text-blue-400 font-medium flex items-center gap-2">
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Employee Signup Card */}
            <button
              onClick={() => {
                setSignupType('employee');
                setStep('form');
              }}
              className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10 hover:border-purple-500/50 transition-all hover:scale-105 text-left group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-xl mb-4 group-hover:bg-purple-600/30 transition-colors">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Employee</h3>
              <p className="text-slate-400">
                Join your company that's already using S.E.A.D.
              </p>
              <div className="mt-4 text-purple-400 font-medium flex items-center gap-2">
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-400 font-medium">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-400 hover:text-blue-300 font-bold transition-colors ml-1"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full space-y-8 animate-fadeIn relative z-10">
        <div className="flex flex-col items-center text-center">
          <button
            onClick={() => setStep('type-selection')}
            className="mb-4 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to selection
          </button>

          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            {signupType === 'company' ? 'Register Company' : 'Employee Signup'}
          </h2>
          <p className="mt-2 text-slate-400 font-medium">
            {signupType === 'company' 
              ? 'Create your company account' 
              : 'Join your company on S.E.A.D.'}
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSignup} autoComplete="off">
            {signupType === 'company' ? (
              <>
                {/* Company Signup Form */}
                <div>
                  <label className={labelClass}>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Admin Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Admin Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    onBlur={validateContactNo}
                    placeholder="Enter 10-digit contact number"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Employee Signup Form */}
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="Enter your employee ID"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    onBlur={validateContactNo}
                    placeholder="Enter 10-digit contact number"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Search Company *</label>
                  <input
                    type="text"
                    required
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    placeholder="Search for your company"
                    autoComplete="off"
                    className={inputClass}
                  />
                  {companySearchQuery && filteredCompanies.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg">
                      {filteredCompanies.map((company) => (
                        <button
                          key={company._id}
                          type="button"
                          onClick={() => {
                            setSelectedCompanyId(company._id);
                            setCompanySearchQuery(company.name);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors ${
                            selectedCompanyId === company._id ? 'bg-slate-700 text-blue-400' : 'text-white'
                          }`}
                        >
                          {company.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Role *</label>
                  <select
                    required
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Common Password Fields */}
            <div>
              <label className={labelClass}>Password *</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                placeholder="Enter your password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className={labelClass}>Confirm Password *</label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : 'Continue to Verification'}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-white/5">
            <p className="text-sm text-slate-400 font-medium">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-400 hover:text-blue-300 font-bold transition-colors ml-1"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
