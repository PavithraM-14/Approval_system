'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../../lib/types';
import PasswordInput from '../../components/PasswordInput';
import OTPVerification from '../../components/OTPVerification';
import InstitutionSelect from '../../components/InstitutionSelect';
import NestedSelect from '../../components/NestedSelect';
import { DENTAL_DEPARTMENTS, ENGINEERING_DEPARTMENTS, FSH_DEPARTMENTS, EEC_DEPARTMENTS, MANAGEMENT_DEPARTMENTS } from '../../lib/constants';

const roleOptions = [
  { value: UserRole.REQUESTER, label: 'Requester/HOD' },
  { value: UserRole.INSTITUTION_MANAGER, label: 'Institution Manager' },
  { value: UserRole.SOP_VERIFIER, label: 'SOP Verifier' },
  { value: UserRole.ACCOUNTANT, label: 'Accountant' },
  { value: UserRole.VP, label: 'Vice President' },
  { value: UserRole.HEAD_OF_INSTITUTION, label: 'Head of Institution' },
  { value: UserRole.DEAN, label: 'Dean' },
  { value: UserRole.MMA, label: 'MMA' },
  { value: UserRole.HR, label: 'HR' },
  { value: UserRole.AUDIT, label: 'Audit' },
  { value: UserRole.IT, label: 'IT' },
  { value: UserRole.CHIEF_DIRECTOR, label: 'Chief Director' },
  { value: UserRole.CHAIRMAN, label: 'Chairman' },
];

const rolesWithDepartment = [UserRole.REQUESTER];
// Roles that do not need to select an Institution
const rolesWithoutCollege = [UserRole.CHAIRMAN, UserRole.DEAN, UserRole.CHIEF_DIRECTOR];

export default function SignupPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.REQUESTER);
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpData, setOtpData] = useState<{
    otp: string;
    otpTimestamp: string;
  } | null>(null);
  const router = useRouter();

  const inputClass =
    'mt-1 block w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all';

  const labelClass = 'block text-sm font-semibold text-slate-300 ml-1';

  const selectClass =
    'mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 ' +
    'bg-white shadow-sm text-gray-900 text-base font-medium ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' +
    'hover:border-gray-400 transition-colors duration-200 ' +
    'appearance-none cursor-pointer';

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

    const isDepartmentRequired = rolesWithDepartment.includes(selectedRole);
    const isCollegeRequired = !rolesWithoutCollege.includes(selectedRole);

    if (
      !name ||
      !email ||
      !password ||
      !empId ||
      !contactNo ||
      (isCollegeRequired && !college) ||
      (isDepartmentRequired && !department)
    ) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
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
        // Store OTP data and move to OTP verification step
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
      // Format contact number
      const contactDigits = contactNo.replace(/\D/g, '');
      const formattedContactNo = `+91 ${contactDigits}`;

      const isDepartmentRequired = rolesWithDepartment.includes(selectedRole);
      const isCollegeRequired = !rolesWithoutCollege.includes(selectedRole);

      // Verify OTP and create account
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          type: 'signup',
          userData: {
            name,
            empId,
            email,
            contactNo: formattedContactNo,
            password,
            role: selectedRole,
            college: isCollegeRequired ? college : null,
            department: isDepartmentRequired ? department : null,
            otp: otpData?.otp,
            otpTimestamp: otpData?.otpTimestamp,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login?message=Account created successfully! Please login.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-xl w-full space-y-8 animate-fadeIn relative z-10">
        <div className="flex flex-col items-center text-center">

          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Create S.E.A.D. Account
          </h2>
          <p className="mt-2 text-slate-400 font-medium">
            Join the System for Enterprise Approval Digitalization
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSignup} autoComplete="off">
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
                placeholder="name@srmrmp.edu.in"
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

            <div>
              <label className={labelClass}>Role *</label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setSelectedRole(role);
                  if (!rolesWithDepartment.includes(role)) setDepartment('');
                  if (rolesWithoutCollege.includes(role)) setCollege('');
                }}
                className={inputClass}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {!rolesWithoutCollege.includes(selectedRole) && (
              <div>
                <label className={`${labelClass} mb-2`}>Institution *</label>
                <div className="relative">
                  <div className="relative">
                    <InstitutionSelect
                      value={college}
                      onChange={setCollege}
                    />
                    {/* Icon is inside the component now */}
                  </div>
                </div>
              </div>
            )}

            {rolesWithDepartment.includes(selectedRole) && (
              <div>
                <label className={`${labelClass} mb-2`}>Department *</label>
                <div className="relative">
                  <NestedSelect
                    value={department}
                    onChange={setDepartment}
                    options={
                      college === 'DENTAL' ? DENTAL_DEPARTMENTS :
                        college === 'EEC' ? EEC_DEPARTMENTS :
                          college?.includes('FSH') ? FSH_DEPARTMENTS :
                            college?.includes('Management') ? MANAGEMENT_DEPARTMENTS :
                              college?.includes('E&T') ? ENGINEERING_DEPARTMENTS :
                                ENGINEERING_DEPARTMENTS
                    }
                    placeholder="Select Department"
                    dropUp={true}
                    disabled={!college}
                  />
                </div>
              </div>
            )}

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