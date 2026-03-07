'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCookiesPage() {
  const [status, setStatus] = useState('Clearing cookies...');
  const router = useRouter();

  useEffect(() => {
    const clearCookies = async () => {
      try {
        // Call logout API to clear server-side cookie
        await fetch('/api/auth/logout', { 
          method: 'POST', 
          credentials: 'include' 
        });
        
        // Clear all cookies client-side
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        setStatus('Cookies cleared! Redirecting to login...');
        
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } catch (error) {
        setStatus('Error clearing cookies. Please clear manually.');
      }
    };

    clearCookies();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="mb-4">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Clearing Session</h1>
        <p className="text-gray-600">{status}</p>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-left">
          <p className="font-semibold text-blue-900 mb-2">Manual Cookie Clear (if needed):</p>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Press F12 to open Developer Tools</li>
            <li>Go to Application tab</li>
            <li>Click Cookies → http://localhost:3000</li>
            <li>Delete the auth-token cookie</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
