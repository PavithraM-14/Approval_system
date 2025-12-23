'use client';

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyOtpContent() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push(`/reset-password?email=${email}`);
    } else {
      setError(data.error || "Invalid OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">

        <h2 className="text-3xl font-bold text-center text-gray-900">
          Enter OTP
        </h2>

        <p className="mt-2 text-center text-gray-600">
          OTP has been sent to your email
        </p>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          <input
            type="text"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter 6-digit OTP"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center tracking-widest"
          />

          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-medium"
          >
            Verify OTP
          </button>
        </form>

      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
