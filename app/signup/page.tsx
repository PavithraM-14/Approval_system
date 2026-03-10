'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '../../lib/types';
import PasswordInput from '../../components/PasswordInput';
import OTPVerification from '../../components/OTPVerification';
import SeadLogo from '../../components/SeadLogo';

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
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
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
      // Don't fetch roles until company is selected
    }
  }, [signupType]);

  // Fetch roles when company is selected
  useEffect(() => {
    if (selectedCompanyId) {
      fetchRoles(selectedCompanyId);
    } else {
      // Clear roles when no company is selected
      setRoles([]);
      setSelectedRoleId('');
    }
  }, [selectedCompanyId]);

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

  const fetchRoles = async (companyId: string) => {
    try {
      const res = await fetch(`/api/roles/company/${companyId}`);
      if (res.ok) {
        const data: Role[] = await res.json();
        const nonAdminRoles = data.filter(r => !r.isSystemAdmin);
        setRoles(nonAdminRoles);
        if (nonAdminRoles.length > 0) {
          setSelectedRoleId(nonAdminRoles[0]._id);
        } else {
          setSelectedRoleId('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <SeadLogo className="w-32 h-20" />
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Join S.E.A.D.
            </h2>
            <p className="text-sm text-gray-600">
              Choose your signup type
            </p>
          </div>

          {/* Signup Type Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Company Signup Card */}
            <button
              onClick={() => {
                setSignupType('company');
                setStep('form');
              }}
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all text-left group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-xl mb-4 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">New Company</h3>
              <p className="text-gray-600 text-sm mb-4">
                Register your company and become the system administrator
              </p>
              <div className="text-indigo-600 font-medium flex items-center gap-2">
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
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all text-left group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-4 group-hover:bg-purple-200 transition-colors">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Employee</h3>
              <p className="text-gray-600 text-sm mb-4">
                Join your company that's already using S.E.A.D.
              </p>
              <div className="text-purple-600 font-medium flex items-center gap-2">
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SeadLogo className="w-32 h-20" />
        </div>

        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => setStep('type-selection')}
            className="mb-4 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to selection
          </button>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {signupType === 'company' ? 'Register Company' : 'Employee Signup'}
          </h2>
          <p className="text-sm text-gray-600 mb-8">
            {signupType === 'company' 
              ? 'Create your company account' 
              : 'Join your company on S.E.A.D.'}
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

          <form className="space-y-6" onSubmit={handleSignup} autoComplete="off">
            {signupType === 'company' ? (
              <>
                {/* Company Signup Form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    onBlur={validateContactNo}
                    placeholder="Enter 10-digit contact number"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Employee Signup Form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="Enter your employee ID"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    onBlur={validateContactNo}
                    placeholder="Enter 10-digit contact number"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Company *</label>
                  <input
                    type="text"
                    required
                    value={companySearchQuery}
                    onChange={(e) => {
                      setCompanySearchQuery(e.target.value);
                      setShowCompanyDropdown(true);
                    }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    placeholder="Click to select or search for your company"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
                  />
                  {showCompanyDropdown && filteredCompanies.length > 0 && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowCompanyDropdown(false)}
                      />
                      <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                        {filteredCompanies.map((company) => (
                          <button
                            key={company._id}
                            type="button"
                            onClick={() => {
                              setSelectedCompanyId(company._id);
                              setCompanySearchQuery(company.name);
                              setShowCompanyDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              selectedCompanyId === company._id 
                                ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                                : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{company.name}</span>
                              {selectedCompanyId === company._id && (
                                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {showCompanyDropdown && filteredCompanies.length === 0 && companySearchQuery && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowCompanyDropdown(false)}
                      />
                      <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                        <p className="text-gray-500 text-sm text-center">
                          No companies found matching "{companySearchQuery}"
                        </p>
                        <p className="text-gray-400 text-xs text-center mt-2">
                          Please check the spelling or contact your administrator
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                  <select
                    required
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                    disabled={!selectedCompanyId}
                  >
                    <option value="">
                      {!selectedCompanyId 
                        ? 'Please select a company first' 
                        : roles.length === 0 
                        ? 'No roles available' 
                        : 'Select a role'}
                    </option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {!selectedCompanyId && (
                    <p className="text-slate-400 text-xs mt-1">
                      Select your company to see available roles
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Common Password Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                placeholder="Enter your password"
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Continue to Verification'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign in
              </button>
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